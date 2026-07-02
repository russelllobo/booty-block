import { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { colors } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: selected ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, selected]);

  return (
    <AnimatedPressable
      {...pressableProps}
      className={className}
      style={[
        {
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(255,255,255,0.75)', colors.petal],
          }),
          borderColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.petal, colors.raspberry],
          }),
          shadowColor: colors.raspberry,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.12],
          }),
          shadowRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 18],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.012],
              }),
            },
          ],
        },
        style,
      ]}
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
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: selected ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, selected]);

  return (
    <Animated.View
      className={className}
      style={[
        {
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.petal, colors.raspberry],
          }),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
