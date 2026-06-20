import { useMemo } from 'react';
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
  if (phase === 'descending' || phase === 'rising') return '#66E3FF';
  return '#FFFFFF';
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
  const points = useMemo(() => Object.entries(landmarks), [landmarks]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${frameWidth} ${frameHeight}`} preserveAspectRatio="xMidYMid meet">
        {connections.map(([fromName, toName]) => {
          const from = landmarks[fromName];
          const to = landmarks[toName];
          if (!from || !to || from.confidence < 0.35 || to.confidence < 0.35) return null;

          return (
            <Line
              key={`${fromName}-${toName}`}
              x1={from.x * frameWidth}
              y1={(1 - from.y) * frameHeight}
              x2={to.x * frameWidth}
              y2={(1 - to.y) * frameHeight}
              stroke={color}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.92}
            />
          );
        })}

        {points.map(([name, point]) => {
          if (!point || point.confidence < 0.35) return null;
          return (
            <Circle
              key={name}
              cx={point.x * frameWidth}
              cy={(1 - point.y) * frameHeight}
              r={7}
              fill={color}
              stroke="#3A1F2C"
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}
