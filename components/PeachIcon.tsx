import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../constants/theme';

export function PeachIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg accessibilityElementsHidden height={size} viewBox="0 0 64 64" width={size}>
      <Circle cx="32" cy="34" fill="#FFD166" r="27" />
      <Circle cx="32" cy="34" fill="none" r="23" stroke="#F4A340" strokeWidth="3" />
      <Path
        d="M32 48c-3-5-14-7-14-18 0-7 5-12 11-12 2 0 4 1 5 3 2-2 4-3 7-3 6 0 11 5 11 12 0 11-12 13-20 18Z"
        fill={colors.bubble}
      />
      <Path d="M34 21c-1-6 2-10 8-11-1 6-3 9-8 11Z" fill="#62B66C" />
      <Path d="M34 23c-4 5-4 14 0 20" fill="none" opacity={0.5} stroke={colors.raspberry} strokeLinecap="round" strokeWidth="2.5" />
    </Svg>
  );
}
