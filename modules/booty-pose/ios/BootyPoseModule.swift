import AVFoundation
import ExpoModulesCore
import ImageIO
import QuartzCore
import Vision

public class BootyPoseModule: Module {
  private let poseSession = BootyPoseSession.shared

  public func definition() -> ModuleDefinition {
    Name("BootyPose")

    Constants([
      "isAvailable": true
    ])

    Events("poseUpdate", "sessionComplete")

    View(BootyPoseCameraView.self) {
      // The explicit builder selects Expo's UIKit native-view definition.
    }

    AsyncFunction("startSessionAsync") { (targetSquats: Int) in
      self.poseSession.start(targetSquats: targetSquats) { eventName, payload in
        DispatchQueue.main.async {
          self.sendEvent(eventName, payload)
        }
      }
    }

    AsyncFunction("stopSessionAsync") {
      self.poseSession.stop()
    }
  }
}

private final class BootyPoseCameraView: ExpoView {
  private let previewLayer = AVCaptureVideoPreviewLayer(session: BootyPoseSession.shared.captureSession)

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds

    guard let connection = previewLayer.connection else {
      return
    }

    if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
    if connection.isVideoMirroringSupported {
      connection.automaticallyAdjustsVideoMirroring = false
      connection.isVideoMirrored = true
    }
  }
}

private final class BootyPoseSession: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  static let shared = BootyPoseSession()

  let captureSession = AVCaptureSession()
  private let captureQueue = DispatchQueue(label: "com.bootyblock.pose.capture")
  private let visionQueue = DispatchQueue(label: "com.bootyblock.pose.vision")

  private var eventSink: ((_ eventName: String, _ payload: [String: Any]) -> Void)?
  private var targetSquats = 1
  private var count = 0
  private var phase = "calibrating"
  private var baselineHipY: CGFloat?
  private var baselineHipKneeSpan: CGFloat?
  private var calibrationSamples: [CGFloat] = []
  private var calibrationSpanSamples: [CGFloat] = []
  private var calibrationMissFrames = 0
  private var sawBottomAt: TimeInterval?
  private var repStartedAt: TimeInterval?
  private var lastCountAt: TimeInterval = 0
  private var bottomFrames = 0
  private var standFrames = 0
  private var smoothedPoints: [VNHumanBodyPoseObservation.JointName: CGPoint] = [:]
  private var latestLandmarks: [String: [String: Any]] = [:]
  private var latestMetrics: [String: Double] = [
    "kneeAngle": 0,
    "hipAngle": 0,
    "torsoLean": 0,
    "depth": 0
  ]
  private var frameWidth = 480
  private var frameHeight = 640
  private var isConfigured = false
  private var isActive = false

  func start(targetSquats: Int, eventSink: @escaping (_ eventName: String, _ payload: [String: Any]) -> Void) {
    self.targetSquats = max(1, targetSquats)
    self.count = 0
    self.phase = "calibrating"
    self.baselineHipY = nil
    self.baselineHipKneeSpan = nil
    self.calibrationSamples = []
    self.calibrationSpanSamples = []
    self.calibrationMissFrames = 0
    self.sawBottomAt = nil
    self.repStartedAt = nil
    self.lastCountAt = 0
    self.bottomFrames = 0
    self.standFrames = 0
    self.smoothedPoints = [:]
    self.latestLandmarks = [:]
    self.eventSink = eventSink
    self.isActive = true

    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureIfNeeded()
      captureQueue.async {
        if !self.captureSession.isRunning {
          self.captureSession.startRunning()
        }
      }
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        if granted {
          self.start(targetSquats: targetSquats, eventSink: eventSink)
        } else {
          self.emit(hint: "Camera permission is needed to count squats.", confidence: 0, visible: false)
        }
      }
    default:
      emit(hint: "Camera permission is needed to count squats.", confidence: 0, visible: false)
    }
  }

  func stop() {
    isActive = false
    eventSink = nil
    captureQueue.async {
      if self.captureSession.isRunning {
        self.captureSession.stopRunning()
      }
    }
  }

  private func configureIfNeeded() {
    guard !isConfigured else {
      return
    }

    captureSession.beginConfiguration()
    captureSession.sessionPreset = .medium

    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
      let input = try? AVCaptureDeviceInput(device: device),
      captureSession.canAddInput(input)
    else {
      captureSession.commitConfiguration()
      emit(hint: "Front camera is not available.", confidence: 0, visible: false)
      return
    }

    captureSession.addInput(input)

    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(self, queue: visionQueue)

    if captureSession.canAddOutput(output) {
      captureSession.addOutput(output)
    }

    captureSession.commitConfiguration()
    isConfigured = true
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard isActive else {
      return
    }

    if let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
      // The Vision request rotates the landscape camera buffer into portrait.
      frameWidth = CVPixelBufferGetHeight(pixelBuffer)
      frameHeight = CVPixelBufferGetWidth(pixelBuffer)
    }

    let request = VNDetectHumanBodyPoseRequest { [weak self] request, _ in
      guard let self else {
        return
      }
      guard self.isActive else {
        return
      }
      guard let observation = request.results?.first as? VNHumanBodyPoseObservation else {
        self.emit(hint: "Step back until your full body is visible.", confidence: 0, visible: false)
        return
      }

      self.handle(observation: observation, timestamp: CACurrentMediaTime())
    }

    let handler = VNImageRequestHandler(cmSampleBuffer: sampleBuffer, orientation: .leftMirrored)
    try? handler.perform([request])
  }

  private func handle(observation: VNHumanBodyPoseObservation, timestamp: TimeInterval) {
    guard
      let leftShoulder = try? observation.recognizedPoint(.leftShoulder),
      let rightShoulder = try? observation.recognizedPoint(.rightShoulder),
      let leftHip = try? observation.recognizedPoint(.leftHip),
      let rightHip = try? observation.recognizedPoint(.rightHip),
      let leftKnee = try? observation.recognizedPoint(.leftKnee),
      let rightKnee = try? observation.recognizedPoint(.rightKnee)
    else {
      emit(hint: "Step back until your full body is visible.", confidence: 0.2, visible: false)
      return
    }

    let recognizedPoints: [(String, VNHumanBodyPoseObservation.JointName, VNRecognizedPoint)] = [
      ("leftShoulder", .leftShoulder, leftShoulder),
      ("rightShoulder", .rightShoulder, rightShoulder),
      ("leftHip", .leftHip, leftHip),
      ("rightHip", .rightHip, rightHip),
      ("leftKnee", .leftKnee, leftKnee),
      ("rightKnee", .rightKnee, rightKnee)
    ]

    var overlayPoints = recognizedPoints
    let optionalLegJoints: [(String, VNHumanBodyPoseObservation.JointName)] = [
      ("leftAnkle", .leftAnkle),
      ("rightAnkle", .rightAnkle)
    ]
    let optionalArmJoints: [(String, VNHumanBodyPoseObservation.JointName)] = [
      ("leftElbow", .leftElbow),
      ("rightElbow", .rightElbow),
      ("leftWrist", .leftWrist),
      ("rightWrist", .rightWrist)
    ]
    for (name, joint) in optionalLegJoints + optionalArmJoints {
      if let point = try? observation.recognizedPoint(joint), point.confidence >= 0.2 {
        overlayPoints.append((name, joint, point))
      }
    }

    let confidence = Double(
      recognizedPoints.map { CGFloat($0.2.confidence) }.reduce(0, +) / CGFloat(recognizedPoints.count)
    )
    updateLandmarks(overlayPoints)

    guard confidence >= 0.42 else {
      emit(hint: "Find brighter light so the squat can count cleanly.", confidence: confidence, visible: true)
      return
    }

    guard
      let leftShoulderPoint = smoothedPoints[.leftShoulder],
      let rightShoulderPoint = smoothedPoints[.rightShoulder],
      let leftHipPoint = smoothedPoints[.leftHip],
      let rightHipPoint = smoothedPoints[.rightHip],
      let leftKneePoint = smoothedPoints[.leftKnee],
      let rightKneePoint = smoothedPoints[.rightKnee]
    else {
      emit(hint: "Hold still while posture tracking locks on.", confidence: confidence, visible: true)
      return
    }
    let leftAnklePoint = smoothedPoints[.leftAnkle]
    let rightAnklePoint = smoothedPoints[.rightAnkle]

    let shoulderMid = midpoint(leftShoulderPoint, rightShoulderPoint)
    let hipMid = midpoint(leftHipPoint, rightHipPoint)
    let kneeMid = midpoint(leftKneePoint, rightKneePoint)
    let hipAngle = average(
      angle(leftShoulderPoint, leftHipPoint, leftKneePoint),
      angle(rightShoulderPoint, rightHipPoint, rightKneePoint)
    )
    let torsoLean = verticalAngle(from: hipMid, to: shoulderMid)
    let hipY = hipMid.y
    let torsoLength = max(distance(shoulderMid, hipMid), 0.1)
    let dropRatio = baselineHipY.map { max(0, ($0 - hipY) / torsoLength) } ?? 0
    let depth = min(1, dropRatio / 0.75)
    let hipKneeRatio = baselineHipKneeSpan.map { max(0, hipY - kneeMid.y) / max($0, 0.04) } ?? 1
    let kneeAngle = leftAnklePoint.flatMap { leftAnkle in
      rightAnklePoint.map { rightAnkle in
        average(
          angle(leftHipPoint, leftKneePoint, leftAnkle),
          angle(rightHipPoint, rightKneePoint, rightAnkle)
        )
      }
    }

    latestMetrics = [
      "kneeAngle": Double(kneeAngle ?? (latestMetrics["kneeAngle"] ?? 0)),
      "hipAngle": Double(hipAngle),
      "torsoLean": Double(torsoLean),
      "depth": Double(depth)
    ]

    if phase == "calibrating" {
      let standingSignals = [
        kneeAngle.map { $0 >= 138 } ?? true,
        hipAngle >= 136,
        torsoLean <= 48,
        hipY > kneeMid.y
      ].filter { $0 }.count
      let standingTall = standingSignals >= 3
      guard standingTall else {
        calibrationMissFrames += 1
        if calibrationMissFrames > 3 {
          calibrationSamples.removeAll()
          calibrationSpanSamples.removeAll()
        }
        emit(hint: "Stand tall and hold still for calibration.", confidence: confidence, visible: true)
        return
      }

      calibrationMissFrames = 0
      calibrationSamples.append(hipY)
      calibrationSpanSamples.append(max(hipY - kneeMid.y, 0.04))
      if calibrationSamples.count > 12 {
        calibrationSamples.removeFirst()
        calibrationSpanSamples.removeFirst()
      }

      if calibrationSamples.count == 12 {
        baselineHipY = median(calibrationSamples)
        baselineHipKneeSpan = median(calibrationSpanSamples)
        phase = "standing"
        emit(hint: "Go low, then stand tall to count one squat.", confidence: confidence, visible: true)
      } else {
        emit(hint: "Hold still for calibration.", confidence: confidence, visible: true)
      }
      return
    }

    guard let baselineHipY, let baselineHipKneeSpan else {
      phase = "calibrating"
      emit(hint: "Stand tall so Bootyblock can learn your starting position.", confidence: confidence, visible: true)
      return
    }

    let kneeWidth = abs(leftKneePoint.x - rightKneePoint.x)
    let ankleWidth = leftAnklePoint.flatMap { leftAnkle in
      rightAnklePoint.map { rightAnkle in abs(leftAnkle.x - rightAnkle.x) }
    }
    let kneesCaving = ankleWidth.map { $0 > 0.06 && kneeWidth / $0 < 0.62 } ?? false
    // Front-facing joints can make any one angle noisy, so combine several
    // independent depth signals instead of requiring every threshold at once.
    let depthSignals = [
      dropRatio >= 0.34,
      hipKneeRatio <= 0.68,
      kneeAngle.map { $0 <= 148 } ?? false,
      hipAngle <= 152
    ].filter { $0 }.count
    let standingSignals = [
      dropRatio <= 0.25,
      hipKneeRatio >= 0.74,
      kneeAngle.map { $0 >= 150 } ?? false,
      hipAngle >= 148
    ].filter { $0 }.count
    let hasGoodDepth = depthSignals >= 3 && (dropRatio >= 0.3 || hipKneeRatio <= 0.68)
    let isStanding = standingSignals >= 3 && dropRatio <= 0.32
    let risingSignals = [
      dropRatio <= 0.25,
      hipKneeRatio >= 0.76,
      kneeAngle.map { $0 >= 148 } ?? false,
      hipAngle >= 150
    ].filter { $0 }.count
    let isClearlyRising = !hasGoodDepth && risingSignals >= 2

    if torsoLean > 52 {
      emit(hint: "Keep your chest up.", confidence: confidence, visible: true)
      return
    }

    if kneesCaving && (phase == "descending" || phase == "bottom") {
      emit(hint: "Press your knees out over your toes.", confidence: confidence, visible: true)
    }

    if hasGoodDepth && (phase == "standing" || phase == "descending" || phase == "bottom") {
      repStartedAt = repStartedAt ?? timestamp
      bottomFrames += 1
      if bottomFrames >= 2 {
        let repElapsed = repStartedAt.map { timestamp - $0 } ?? 0
        let canCount = repElapsed >= 0.35 && timestamp - lastCountAt >= 0.35

        if canCount {
          count = min(targetSquats, count + 1)
          lastCountAt = timestamp
        }

        phase = canCount ? (count >= targetSquats ? "complete" : "rising") : "bottom"
        sawBottomAt = canCount ? nil : timestamp
        standFrames = 0
        emit(
          hint: canCount
            ? (count >= targetSquats ? "Banked. You earned those minutes." : "Counted. Drop again.")
            : "Slow it down and use your full range.",
          confidence: confidence,
          visible: true
        )

      } else {
        phase = "descending"
        emit(hint: "Hold that depth.", confidence: confidence, visible: true)
      }
      return
    }

    if (dropRatio > 0.14 || hipKneeRatio < 0.86 || (kneeAngle.map { $0 < 152 } ?? false)) && phase == "standing" {
      phase = "descending"
      repStartedAt = timestamp
      bottomFrames = 0
      emit(hint: "Keep going.", confidence: confidence, visible: true)
      return
    }

    if phase == "bottom" && isClearlyRising && !isStanding {
      phase = "rising"
      standFrames = 0
      emit(hint: "Stand tall.", confidence: confidence, visible: true)
      return
    }

    if phase == "descending" && isStanding {
      phase = "standing"
      repStartedAt = nil
      bottomFrames = 0
      emit(hint: "That was a little shallow. Try sitting lower.", confidence: confidence, visible: true)
      return
    }

    if phase == "rising" && isStanding && sawBottomAt == nil {
      phase = "standing"
      repStartedAt = nil
      bottomFrames = 0
      standFrames = 0
      emit(hint: "Drop again.", confidence: confidence, visible: true)
      return
    }

    // Vision can occasionally drop the intermediate rising frame. Accept a
    // direct bottom-to-standing transition while still requiring stable
    // standing frames and the normal rep timing checks.
    if (phase == "rising" || phase == "bottom") && isStanding, let sawBottomAt {
      standFrames += 1
      guard standFrames >= 2 else {
        emit(hint: "Finish tall.", confidence: confidence, visible: true)
        return
      }

      let repElapsed = repStartedAt.map { timestamp - $0 } ?? 0
      let canCount = repElapsed >= 0.45 && timestamp - sawBottomAt >= 0.12 && timestamp - lastCountAt >= 0.45
      if canCount {
        count = min(targetSquats, count + 1)
        lastCountAt = timestamp
      }

      phase = count >= targetSquats ? "complete" : "standing"
      self.sawBottomAt = nil
      repStartedAt = nil
      bottomFrames = 0
      standFrames = 0
      emit(
        hint: canCount
          ? (count >= targetSquats ? "Banked. You earned those minutes." : "Counted. Drop again.")
          : "Slow it down and use your full range.",
        confidence: confidence,
        visible: true
      )

      return
    }

    if phase == "standing" {
      // Adapt gently if the user shifts position without recalibrating.
      self.baselineHipY = self.baselineHipY.map { ($0 * 0.98) + (hipY * 0.02) }
      let currentSpan = max(hipY - kneeMid.y, 0.04)
      self.baselineHipKneeSpan = self.baselineHipKneeSpan.map { ($0 * 0.98) + (currentSpan * 0.02) }
    }

    emit(hint: phase == "complete" ? "Banked. You earned those minutes." : "Stay smooth and steady.", confidence: confidence, visible: true)
  }

  private func emit(hint: String, confidence: Double, visible: Bool) {
    guard isActive else {
      return
    }

    eventSink?("poseUpdate", [
      "count": count,
      "target": targetSquats,
      "phase": phase,
      "confidence": confidence,
      "visible": visible,
      "hint": hint,
      "landmarks": latestLandmarks,
      "metrics": latestMetrics,
      "frameWidth": frameWidth,
      "frameHeight": frameHeight
    ])
  }

  private func updateLandmarks(_ points: [(String, VNHumanBodyPoseObservation.JointName, VNRecognizedPoint)]) {
    let smoothing: CGFloat = 0.78
    var landmarks: [String: [String: Any]] = [:]

    for (name, joint, recognizedPoint) in points {
      let raw = recognizedPoint.location
      let previous = smoothedPoints[joint] ?? raw
      let smoothed = CGPoint(
        x: previous.x + ((raw.x - previous.x) * smoothing),
        y: previous.y + ((raw.y - previous.y) * smoothing)
      )
      smoothedPoints[joint] = smoothed
      landmarks[name] = [
        "x": Double(smoothed.x),
        "y": Double(smoothed.y),
        "confidence": Double(recognizedPoint.confidence)
      ]
    }

    latestLandmarks = landmarks
  }

  private func midpoint(_ first: CGPoint, _ second: CGPoint) -> CGPoint {
    CGPoint(x: (first.x + second.x) / 2, y: (first.y + second.y) / 2)
  }

  private func distance(_ first: CGPoint, _ second: CGPoint) -> CGFloat {
    hypot(first.x - second.x, first.y - second.y)
  }

  private func average(_ first: CGFloat, _ second: CGFloat) -> CGFloat {
    (first + second) / 2
  }

  private func angle(_ first: CGPoint, _ vertex: CGPoint, _ third: CGPoint) -> CGFloat {
    let firstVector = CGVector(dx: first.x - vertex.x, dy: first.y - vertex.y)
    let secondVector = CGVector(dx: third.x - vertex.x, dy: third.y - vertex.y)
    let denominator = max(
      hypot(firstVector.dx, firstVector.dy) * hypot(secondVector.dx, secondVector.dy),
      0.0001
    )
    let cosine = max(-1, min(1, (firstVector.dx * secondVector.dx + firstVector.dy * secondVector.dy) / denominator))
    return acos(cosine) * 180 / .pi
  }

  private func verticalAngle(from bottom: CGPoint, to top: CGPoint) -> CGFloat {
    atan2(abs(top.x - bottom.x), max(abs(top.y - bottom.y), 0.0001)) * 180 / .pi
  }

  private func median(_ values: [CGFloat]) -> CGFloat {
    let sorted = values.sorted()
    let middle = sorted.count / 2
    if sorted.count.isMultiple(of: 2) {
      return (sorted[middle - 1] + sorted[middle]) / 2
    }
    return sorted[middle]
  }
}
