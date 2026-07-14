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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.75)', '#FFE7F1'],
    ),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.petal, colors.raspberry]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.012]) }],
  }));

  return (
    <AnimatedPressable
      {...pressableProps}
      className={className}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
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
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.06]) }],
  }));

  return (
    <Animated.View className={className} style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
