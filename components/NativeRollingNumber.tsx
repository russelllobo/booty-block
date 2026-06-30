import { requireNativeViewManager } from 'expo-modules-core';
import { ComponentType, useEffect, useRef } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

import { colors } from '../constants/theme';
import { RollingNumber } from './RollingNumber';

type NativeRollingNumberProps = {
  value: string | number;
  color?: string;
  countsDown?: boolean;
  fontSize?: number;
  fontWeight?: '900' | '800' | '700' | '600';
  letterSpacing?: number;
  style?: StyleProp<ViewStyle>;
};

type NativeViewProps = NativeRollingNumberProps & {
  value: string;
  countsDown: boolean;
};

let NativeRollingNumberView: ComponentType<NativeViewProps> | null = null;

if (Platform.OS === 'ios') {
  try {
    NativeRollingNumberView =
      requireNativeViewManager<NativeViewProps>('RollingNumber', 'RollingNumberView');
  } catch {
    NativeRollingNumberView = null;
  }
}

export function NativeRollingNumber({
  value,
  color = colors.cocoa,
  countsDown: explicitCountsDown,
  fontSize = 124,
  fontWeight = '900',
  letterSpacing = 0,
  style,
}: NativeRollingNumberProps) {
  const stringValue = String(value);
  const previousNumericValue = useRef(Number(value));
  const currentNumericValue = Number(value);
  const inferredCountsDown = Number.isFinite(currentNumericValue)
    && Number.isFinite(previousNumericValue.current)
    && currentNumericValue < previousNumericValue.current;
  const countsDown = explicitCountsDown ?? inferredCountsDown;

  useEffect(() => {
    previousNumericValue.current = currentNumericValue;
  }, [currentNumericValue]);

  if (NativeRollingNumberView) {
    return (
      <NativeRollingNumberView
        value={stringValue}
        color={color}
        fontSize={fontSize}
        fontWeight={fontWeight}
        letterSpacing={letterSpacing}
        countsDown={countsDown}
        style={style}
      />
    );
  }

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <RollingNumber
        value={stringValue}
        color={color}
        fontSize={fontSize}
        fontWeight={fontWeight}
        letterSpacing={letterSpacing}
        smooth
        direction={countsDown ? 'down' : 'up'}
      />
    </View>
  );
}
