import { useIsFocused } from 'expo-router';
import { ReactNode, useLayoutEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export type SlideDirection = 'forward' | 'back';

type SlidePanelProps = {
  stepKey?: string | number;
  direction?: SlideDirection;
  distance?: number;
  children: ReactNode;
};

export function useStepDirection(step: number): SlideDirection {
  const prevRef = useRef(step);
  const dir: SlideDirection = step >= prevRef.current ? 'forward' : 'back';
  useLayoutEffect(() => {
    prevRef.current = step;
  }, [step]);
  return dir;
}

export function SlidePanel({
  stepKey,
  direction = 'forward',
  distance = 42,
  children,
}: SlidePanelProps) {
  const isFocused = useIsFocused();
  const translateX = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hasFocused = useRef(false);
  const firstStep = useRef(true);
  const dirRef = useRef<SlideDirection>(direction);
  dirRef.current = direction;

  function slideIn(dir: SlideDirection) {
    const start = dir === 'back' ? -distance : distance;
    translateX.setValue(start);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 300,
        damping: 26,
        mass: 0.85,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  useLayoutEffect(() => {
    if (isFocused) {
      const dir: SlideDirection = hasFocused.current ? 'back' : 'forward';
      hasFocused.current = true;
      slideIn(dir);
    } else {
      translateX.setValue(-distance);
      opacity.setValue(0);
    }
  }, [isFocused]);

  useLayoutEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    if (!isFocused) return;
    slideIn(dirRef.current);
  }, [stepKey]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
      {children}
    </Animated.View>
  );
}
