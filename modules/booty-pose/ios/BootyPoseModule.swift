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

    View(BootyPoseCameraView.self)

    AsyncFunction("startSessionAsync") { (targetSquats: Int) in
      self.poseSession.start(targetSquats: targetSquats) { eventName, payload in
        self.sendEvent(eventName, payload)
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

  func start(targetSquats: Int, eventSink: @escaping (_ eventName: String, _ payload: [String: Any]) -> Void) {
    self.targetSquats = max(1, targetSquats)
    self.count = 0
    self.phase = "calibrating"
    self.baselineHipY = nil
    self.baselineHipKneeSpan = nil
    self.calibrationSamples = []
    self.calibrationSpanSamples = []
    self.sawBottomAt = nil
    self.repStartedAt = nil
    self.lastCountAt = 0
    self.bottomFrames = 0
    self.standFrames = 0
    self.smoothedPoints = [:]
    self.latestLandmarks = [:]
    self.eventSink = eventSink

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
    if let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
      // The Vision request rotates the landscape camera buffer into portrait.
      frameWidth = CVPixelBufferGetHeight(pixelBuffer)
      frameHeight = CVPixelBufferGetWidth(pixelBuffer)
    }

    let request = VNDetectHumanBodyPoseRequest { [weak self] request, _ in
      guard let self else {
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
      let rightKnee = try? observation.recognizedPoint(.rightKnee),
      let leftAnkle = try? observation.recognizedPoint(.leftAnkle),
      let rightAnkle = try? observation.recognizedPoint(.rightAnkle)
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
      ("rightKnee", .rightKnee, rightKnee),
      ("leftAnkle", .leftAnkle, leftAnkle),
      ("rightAnkle", .rightAnkle, rightAnkle)
    ]

    let confidence = Double(recognizedPoints.map { $0.2.confidence }.min() ?? 0)
    updateLandmarks(recognizedPoints)

    guard confidence >= 0.55 else {
      emit(hint: "Find brighter light so the squat can count cleanly.", confidence: confidence, visible: true)
      return
    }

    guard
      let leftShoulderPoint = smoothedPoints[.leftShoulder],
      let rightShoulderPoint = smoothedPoints[.rightShoulder],
      let leftHipPoint = smoothedPoints[.leftHip],
      let rightHipPoint = smoothedPoints[.rightHip],
      let leftKneePoint = smoothedPoints[.leftKnee],
      let rightKneePoint = smoothedPoints[.rightKnee],
      let leftAnklePoint = smoothedPoints[.leftAnkle],
      let rightAnklePoint = smoothedPoints[.rightAnkle]
    else {
      emit(hint: "Hold still while posture tracking locks on.", confidence: confidence, visible: true)
      return
    }

    let shoulderMid = midpoint(leftShoulderPoint, rightShoulderPoint)
    let hipMid = midpoint(leftHipPoint, rightHipPoint)
    let kneeMid = midpoint(leftKneePoint, rightKneePoint)
    let kneeAngle = average(
      angle(leftHipPoint, leftKneePoint, leftAnklePoint),
      angle(rightHipPoint, rightKneePoint, rightAnklePoint)
    )
    let hipAngle = average(
      angle(leftShoulderPoint, leftHipPoint, leftKneePoint),
      angle(rightShoulderPoint, rightHipPoint, rightKneePoint)
    )
    let torsoLean = verticalAngle(from: hipMid, to: shoulderMid)
    let hipY = hipMid.y
    let torsoLength = max(distance(shoulderMid, hipMid), 0.1)
    let dropRatio = baselineHipY.map { max(0, ($0 - hipY) / torsoLength) } ?? 0
    let depth = min(1, dropRatio / 0.75)

    latestMetrics = [
      "kneeAngle": Double(kneeAngle),
      "hipAngle": Double(hipAngle),
      "torsoLean": Double(torsoLean),
      "depth": Double(depth)
    ]

    if phase == "calibrating" {
      let standingTall = kneeAngle >= 155 && hipAngle >= 150 && torsoLean <= 30
      guard standingTall else {
        calibrationSamples.removeAll()
        calibrationSpanSamples.removeAll()
        emit(hint: "Stand tall and hold still for calibration.", confidence: confidence, visible: true)
        return
      }

      calibrationSamples.append(hipY)
      calibrationSpanSamples.append(max(hipY - kneeMid.y, 0.04))
      if calibrationSamples.count > 15 {
        calibrationSamples.removeFirst()
        calibrationSpanSamples.removeFirst()
      }

      if calibrationSamples.count == 15 {
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

    let ankleWidth = abs(leftAnklePoint.x - rightAnklePoint.x)
    let kneeWidth = abs(leftKneePoint.x - rightKneePoint.x)
    let kneesCaving = ankleWidth > 0.06 && kneeWidth / ankleWidth < 0.62
    let hipKneeRatio = max(0, hipY - kneeMid.y) / max(baselineHipKneeSpan, 0.04)
    // Hip-to-knee compression keeps front-facing squats accurate, where a
    // sagittal knee angle is less pronounced than it is from a side view.
    let hasGoodDepth = dropRatio >= 0.45 && hipKneeRatio <= 0.58 && kneeAngle <= 150 && hipAngle <= 155
    let isStanding = dropRatio <= 0.24 && hipKneeRatio >= 0.78 && kneeAngle >= 155 && hipAngle >= 150

    if torsoLean > 48 {
      emit(hint: "Keep your chest up.", confidence: confidence, visible: true)
      return
    }

    if kneesCaving && (phase == "descending" || phase == "bottom") {
      emit(hint: "Press your knees out over your toes.", confidence: confidence, visible: true)
    }

    if hasGoodDepth && (phase == "standing" || phase == "descending") {
      repStartedAt = repStartedAt ?? timestamp
      bottomFrames += 1
      if bottomFrames >= 3 {
        phase = "bottom"
        sawBottomAt = sawBottomAt ?? timestamp
        emit(hint: kneesCaving ? "Press your knees out, then stand tall." : "Nice depth. Stand tall to lock it in.", confidence: confidence, visible: true)
      } else {
        phase = "descending"
        emit(hint: "Hold that depth.", confidence: confidence, visible: true)
      }
      return
    }

    if (dropRatio > 0.18 || kneeAngle < 148) && phase == "standing" {
      phase = "descending"
      repStartedAt = timestamp
      bottomFrames = 0
      emit(hint: "Keep going.", confidence: confidence, visible: true)
      return
    }

    if phase == "bottom" && !isStanding {
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

    if phase == "rising" && isStanding, let sawBottomAt {
      standFrames += 1
      guard standFrames >= 3 else {
        emit(hint: "Finish tall.", confidence: confidence, visible: true)
        return
      }

      let repElapsed = repStartedAt.map { timestamp - $0 } ?? 0
      let canCount = repElapsed >= 0.7 && timestamp - sawBottomAt >= 0.25 && timestamp - lastCountAt >= 0.7
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
          ? (count >= targetSquats ? "Unlocked. You earned those minutes." : "Counted. Drop again.")
          : "Slow it down and use your full range.",
        confidence: confidence,
        visible: true
      )

      if count >= targetSquats {
        eventSink?("sessionComplete", [
          "squats": count,
          "grantedMinutes": count
        ])
        stop()
      }
      return
    }

    if phase == "standing" {
      // Adapt gently if the user shifts position without recalibrating.
      self.baselineHipY = self.baselineHipY.map { ($0 * 0.98) + (hipY * 0.02) }
      let currentSpan = max(hipY - kneeMid.y, 0.04)
      self.baselineHipKneeSpan = self.baselineHipKneeSpan.map { ($0 * 0.98) + (currentSpan * 0.02) }
    }

    emit(hint: phase == "complete" ? "Unlocked. You earned those minutes." : "Stay smooth and steady.", confidence: confidence, visible: true)
  }

  private func emit(hint: String, confidence: Double, visible: Bool) {
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
    let smoothing: CGFloat = 0.38
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
