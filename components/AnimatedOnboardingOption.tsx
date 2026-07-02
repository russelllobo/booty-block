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
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: selected ? 1 : 0,
        duration: selected ? 320 : 200,
        easing: selected ? Easing.out(Easing.back(1.15)) : Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: selected ? 1 : 0,
          duration: selected ? 320 : 1,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [progress, pulse, selected]);

  return (
    <AnimatedPressable
      {...pressableProps}
      className={className}
      style={[
        {
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(255,255,255,0.75)', '#FFE7F1'],
          }),
          borderColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.petal, colors.raspberry],
          }),
          shadowColor: colors.raspberry,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.2],
          }),
          shadowRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 22],
          }),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          borderColor: colors.raspberry,
          borderRadius: 999,
          borderWidth: 2,
          bottom: 2,
          left: 2,
          opacity: pulse.interpolate({
            inputRange: [0, 0.24, 1],
            outputRange: [0, 0.16, 0],
          }),
          position: 'absolute',
          right: 2,
          top: 2,
        }}
      />
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
      duration: selected ? 320 : 200,
      easing: selected ? Easing.out(Easing.back(1.2)) : Easing.out(Easing.cubic),
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
