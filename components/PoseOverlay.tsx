import { useMemo, useRef } from 'react';
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
  onLayout?: (event: LayoutChangeEvent) => void;
};

const MIN_LANDMARK_CONFIDENCE = 0.35;
const LANDMARK_HOLD_MS = 120;

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

function overlayColor(phase: PosePhase, visible: boolean) {
  if (!visible) return '#FFD166';
  if (phase === 'bottom' || phase === 'complete') return '#89F38C';
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

export function PoseOverlay({
  landmarks,
  phase,
  visible,
  frameWidth,
  frameHeight,
  onLayout,
}: PoseOverlayProps) {
  const color = overlayColor(phase, visible);
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
