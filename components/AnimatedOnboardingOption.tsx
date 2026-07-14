import { ReactNode, useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../constants/theme';

const selectionTiming = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

type AnimatedOnboardingOptionProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  className?: string;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedOnboardingOption({
  children,
  className,
  selected,
  style,
  ...pressableProps
}: AnimatedOnboardingOptionProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, selectionTiming);
  }, [progress, selected]);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.75)', '#FFE7F1'],
    ),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.petal, colors.raspberry]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.976, 1]) }],
  }));

  return (
    <Pressable
      {...pressableProps}
      className={className}
      style={[{ backgroundColor: 'transparent', borderColor: 'transparent' }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            borderRadius: 999,
            borderWidth: 2,
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          },
          backgroundStyle,
        ]}
      />
      {children}
    </Pressable>
  );
}

type AnimatedOnboardingOptionIconProps = {
  children: ReactNode;
  className?: string;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedOnboardingOptionIcon({
  children,
  className,
  selected,
  style,
}: AnimatedOnboardingOptionIconProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, selectionTiming);
  }, [progress, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.petal, colors.raspberry],
    ),
  }));

  return (
    <Animated.View className={className} style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
