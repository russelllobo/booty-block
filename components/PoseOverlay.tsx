import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import type {
  PoseLandmarkName,
  PoseLandmarks,
  PosePhase,
} from '../modules/booty-pose/src/BootyPose.types';

type PoseOverlayProps = {
  landmarks: PoseLandmarks;
  phase: PosePhase;
  visible: boolean;
  frameWidth: number;
  frameHeight: number;
  successFlashMs?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
};

const MIN_LANDMARK_CONFIDENCE = 0.25;
const LANDMARK_HOLD_MS = 220;

type CachedLandmark = {
  point: NonNullable<PoseLandmarks[PoseLandmarkName]>;
  updatedAt: number;
};

const connections: [PoseLandmarkName, PoseLandmarkName][] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['rightHip', 'rightKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightKnee', 'rightAnkle'],
];

function isSuccessPhase(phase: PosePhase) {
  return phase === 'bottom' || phase === 'rising' || phase === 'complete';
}

function useSuccessColor(phase: PosePhase, successFlashMs?: number) {
  const successPhase = isSuccessPhase(phase);
  const [flashActive, setFlashActive] = useState(successFlashMs === undefined && successPhase);
  const wasSuccessPhaseRef = useRef(successFlashMs === undefined && successPhase);

  useEffect(() => {
    if (successFlashMs === undefined) {
      setFlashActive(successPhase);
      wasSuccessPhaseRef.current = successPhase;
      return;
    }

    if (!successPhase) {
      wasSuccessPhaseRef.current = false;
      setFlashActive(false);
      return;
    }

    if (wasSuccessPhaseRef.current) return;

    wasSuccessPhaseRef.current = true;
    setFlashActive(true);
    const timer = setTimeout(() => setFlashActive(false), successFlashMs);
    return () => clearTimeout(timer);
  }, [successFlashMs, successPhase]);

  return successFlashMs === undefined ? successPhase : flashActive;
}

function overlayColor(successColor: boolean, visible: boolean) {
  if (!visible) return '#FFD166';
  if (successColor) return '#89F38C';
  return '#FFFFFF';
}

function useStableLandmarks(landmarks: PoseLandmarks, visible: boolean) {
  const cacheRef = useRef<Partial<Record<PoseLandmarkName, CachedLandmark>>>({});

  return useMemo(() => {
    if (!visible) {
      cacheRef.current = {};
      return {};
    }

    const now = Date.now();
    const stableLandmarks: PoseLandmarks = {};
    const names = new Set<PoseLandmarkName>([
      ...(Object.keys(cacheRef.current) as PoseLandmarkName[]),
      ...(Object.keys(landmarks) as PoseLandmarkName[]),
    ]);

    names.forEach((name) => {
      const point = landmarks[name];
      if (point && point.confidence >= MIN_LANDMARK_CONFIDENCE) {
        cacheRef.current[name] = { point, updatedAt: now };
        stableLandmarks[name] = point;
        return;
      }

      const cached = cacheRef.current[name];
      if (cached && now - cached.updatedAt <= LANDMARK_HOLD_MS) {
        stableLandmarks[name] = cached.point;
      } else {
        delete cacheRef.current[name];
      }
    });

    return stableLandmarks;
  }, [landmarks, visible]);
}

function connectionPoint(landmarks: PoseLandmarks, name: PoseLandmarkName) {
  const point = landmarks[name];
  if (point && point.confidence >= MIN_LANDMARK_CONFIDENCE) return point;

  if (name !== 'leftAnkle' && name !== 'rightAnkle') return undefined;

  const side = name === 'leftAnkle' ? 'left' : 'right';
  const hip = landmarks[`${side}Hip`];
  const knee = landmarks[`${side}Knee`];
  if (
    !hip ||
    !knee ||
    hip.confidence < MIN_LANDMARK_CONFIDENCE ||
    knee.confidence < MIN_LANDMARK_CONFIDENCE
  ) {
    return undefined;
  }

  // If the foot is outside the frame, continue the thigh's direction to
  // approximate the shin. SVG clipping makes the line end at the camera edge.
  return {
    x: knee.x + (knee.x - hip.x),
    y: knee.y + (knee.y - hip.y),
    confidence: Math.min(hip.confidence, knee.confidence),
  };
}

function PoseOverlayComponent({
  landmarks,
  phase,
  visible,
  frameWidth,
  frameHeight,
  successFlashMs,
  onLayout,
}: PoseOverlayProps) {
  const successColor = useSuccessColor(phase, successFlashMs);
  const color = overlayColor(successColor, visible);
  const stableLandmarks = useStableLandmarks(landmarks, visible);
  const points = useMemo(() => Object.entries(stableLandmarks), [stableLandmarks]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${frameWidth} ${frameHeight}`} preserveAspectRatio="xMidYMid slice">
        {connections.map(([fromName, toName]) => {
          const from = connectionPoint(stableLandmarks, fromName);
          const to = connectionPoint(stableLandmarks, toName);
          if (!from || !to) return null;

          return (
            <Line
              key={`${fromName}-${toName}`}
              x1={from.x * frameWidth}
              y1={(1 - from.y) * frameHeight}
              x2={to.x * frameWidth}
              y2={(1 - to.y) * frameHeight}
              stroke={color}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={1}
            />
          );
        })}

        {points.map(([name, point]) => {
          if (!point || point.confidence < MIN_LANDMARK_CONFIDENCE) return null;
          return (
            <Circle
              key={name}
              cx={point.x * frameWidth}
              cy={(1 - point.y) * frameHeight}
              r={9}
              fill={color}
              stroke="#3A1F2C"
              strokeWidth={3}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export const PoseOverlay = memo(PoseOverlayComponent);
