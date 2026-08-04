import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

import type { PeachPatchStage } from '../lib/peachPatch';

type PeachPatchNativeIllustrationProps = {
  stage: PeachPatchStage;
};

const TREE_POSITIONS: Array<[number, number, number]> = [
  [271, 369, 1], [298, 386, 0.86], [250, 395, 0.92], [318, 407, 0.78],
  [281, 424, 0.84], [225, 371, 0.76], [332, 377, 0.72], [235, 420, 0.72],
  [112, 403, 0.84], [88, 420, 0.76], [134, 430, 0.7], [158, 407, 0.68],
  [63, 393, 0.72], [175, 437, 0.64], [344, 424, 0.62], [204, 390, 0.62],
  [190, 349, 0.68],
];

const FARMER_POSITIONS: Array<[number, number, string]> = [
  [181, 397, '#E91E73'], [214, 419, '#F47B2C'], [151, 380, '#7852B8'],
  [244, 391, '#159783'], [130, 424, '#E91E73'], [275, 438, '#F47B2C'],
  [101, 390, '#7852B8'], [309, 410, '#159783'],
];

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Ellipse cx="0" cy="8" fill="#FFFFFF" opacity="0.92" rx="32" ry="13" />
      <Circle cx="-17" cy="1" fill="#FFFFFF" opacity="0.94" r="14" />
      <Circle cx="5" cy="-5" fill="#FFFFFF" r="20" />
      <Circle cx="24" cy="3" fill="#FFFFFF" opacity="0.96" r="13" />
    </G>
  );
}

function PeachTree({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Ellipse cx="0" cy="16" fill="#244B28" opacity="0.18" rx="17" ry="6" />
      <Rect fill="#724027" height="25" rx="3" width="7" x="-3.5" y="-7" />
      <Circle cx="-9" cy="-12" fill="#2F873D" r="14" />
      <Circle cx="8" cy="-13" fill="#58B84E" r="15" />
      <Circle cx="0" cy="-25" fill="#3C9F4A" r="17" />
      <Circle cx="-8" cy="-18" fill="#FF7F98" r="3.4" />
      <Circle cx="7" cy="-24" fill="#FF91A8" r="3.4" />
      <Circle cx="10" cy="-10" fill="#FF6F8F" r="3.2" />
    </G>
  );
}

function Farmer({ x, y, shirt }: { x: number; y: number; shirt: string }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx="0" cy="13" fill="#244B28" opacity="0.18" rx="8" ry="3" />
      <Rect fill="#265C97" height="11" rx="2" width="4" x="-5" y="3" />
      <Rect fill="#265C97" height="11" rx="2" width="4" x="1" y="3" />
      <Path d="M-7 3 L-5 -9 L5 -9 L7 3 Z" fill={shirt} />
      <Circle cx="0" cy="-14" fill="#A26747" r="6" />
      <Ellipse cx="0" cy="-19" fill="#F3BC3C" rx="9" ry="2.5" />
      <Rect fill="#D99B28" height="4" rx="2" width="8" x="-4" y="-23" />
    </G>
  );
}

function Barn() {
  return (
    <G transform="translate(105 352)">
      <Ellipse cx="0" cy="46" fill="#244B28" opacity="0.2" rx="42" ry="10" />
      <Path d="M-36 3 L0 -24 L36 3 L36 48 L-36 48 Z" fill="#DB3159" />
      <Path d="M-43 5 L0 -31 L43 5 L33 10 L0 -17 L-33 10 Z" fill="#5E2131" />
      <Rect fill="#F7B7A6" height="30" width="21" x="-10.5" y="18" />
      <Path d="M-10 18 L10 48 M10 18 L-10 48" stroke="#5E2131" strokeWidth="3" />
      <Rect fill="#FFF1CD" height="10" rx="2" width="12" x="-6" y="-1" />
    </G>
  );
}

function Shed() {
  return (
    <G transform="translate(112 383) scale(.72)">
      <Rect fill="#F29B50" height="43" width="58" x="-29" y="0" />
      <Path d="M-36 2 L0 -23 L36 2 L29 10 L0 -10 L-29 10 Z" fill="#5E2131" />
      <Rect fill="#6B3924" height="28" width="16" x="-8" y="15" />
    </G>
  );
}

function Windmill() {
  return (
    <G transform="translate(292 337)">
      <Ellipse cx="0" cy="63" fill="#244B28" opacity="0.2" rx="30" ry="8" />
      <Path d="M-15 58 L-10 0 L10 0 L15 58 Z" fill="#F4D9A3" />
      <Path d="M-15 2 L0 -18 L15 2 Z" fill="#5E2131" />
      <G transform="translate(0 12) rotate(12)">
        <Rect fill="#FFF1CD" height="54" rx="3" width="7" x="-3.5" y="-54" />
        <Rect fill="#FFF1CD" height="54" rx="3" width="7" x="-3.5" y="0" />
        <Rect fill="#FFF1CD" height="7" rx="3" width="54" x="-54" y="-3.5" />
        <Rect fill="#FFF1CD" height="7" rx="3" width="54" x="0" y="-3.5" />
        <Circle fill="#6B3924" r="7" />
      </G>
    </G>
  );
}

export function PeachPatchNativeIllustration({ stage }: PeachPatchNativeIllustrationProps) {
  const cropRows = Array.from({ length: stage.cropRows }, (_, index) => index);

  return (
    <View
      accessibilityLabel={`Native illustration of ${stage.title} with ${stage.farmers} farmers and ${stage.peachTrees} peach trees`}
      style={styles.container}
    >
      <View style={styles.canvas}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 390 844" width="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#72B3E8" />
            <Stop offset="1" stopColor="#A9D6F3" />
          </LinearGradient>
          <LinearGradient id="grass" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#82CC55" />
            <Stop offset="1" stopColor="#55A83F" />
          </LinearGradient>
        </Defs>

        <Rect fill="url(#sky)" height="844" width="390" />
        <Circle cx="326" cy="158" fill="#FFF6CE" opacity="0.32" r="58" />
        <Circle cx="326" cy="158" fill="#FFF6CE" opacity="0.72" r="29" />
        <Cloud scale={0.9} x={72} y={194} />
        <Cloud scale={0.62} x={312} y={251} />
        <Cloud scale={0.52} x={98} y={525} />

        <G>
          <Ellipse cx="195" cy="474" fill="#30522B" opacity="0.16" rx="166" ry="39" />
          <Polygon fill="#314A23" points="42,394 195,481 348,394 348,421 195,511 42,421" />
          <Polygon fill="#496B2D" points="42,380 195,467 348,380 348,401 195,489 42,401" />
          <Polygon fill="url(#grass)" points="42,374 195,287 348,374 195,462" />

          <Path d="M67 371 L191 301 L213 313 L89 383 Z" fill="#EBC477" opacity="0.92" />
          <Path d="M182 298 L207 312 L207 447 L181 432 Z" fill="#EBC477" opacity="0.92" />

          {cropRows.map((row) => {
            const y = 342 + row * 10;
            return (
              <G key={`crop-${row}`}>
                <Path d={`M126 ${y} L181 ${y - 31} L194 ${y - 24} L139 ${y + 7} Z`} fill="#7B4229" />
                {Array.from({ length: 6 }, (_, plant) => (
                  <Circle
                    cx={135 + plant * 9}
                    cy={y - 3 - plant * 5}
                    fill="#45A94C"
                    key={`crop-${row}-${plant}`}
                    r="3.2"
                  />
                ))}
              </G>
            );
          })}

          {stage.hasPond ? (
            <G>
              <Ellipse cx="262" cy="409" fill="#347FAA" opacity="0.25" rx="35" ry="15" />
              <Ellipse cx="260" cy="404" fill="#56BCE5" rx="32" ry="13" />
              <Ellipse cx="251" cy="400" fill="#BDEEFF" opacity="0.55" rx="12" ry="3" />
              <Circle cx="277" cy="405" fill="#67B94E" r="5" />
            </G>
          ) : null}

          <Shed />
          {stage.hasBarn ? <Barn /> : null}
          {stage.hasWindmill ? <Windmill /> : null}

          {TREE_POSITIONS.slice(0, stage.peachTrees).map(([x, y, scale], index) => (
            <PeachTree key={`tree-${index}`} scale={scale} x={x} y={y} />
          ))}
          {FARMER_POSITIONS.slice(0, stage.farmers).map(([x, y, shirt], index) => (
            <Farmer key={`farmer-${index}`} shirt={shirt} x={x} y={y} />
          ))}
        </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7DB8E8',
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});
