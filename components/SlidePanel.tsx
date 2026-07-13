import { ReactNode, useLayoutEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export type SlideDirection = 'forward' | 'back';

type SlidePanelProps = {
  stepKey?: string | number;
  direction?: SlideDirection;
  distance?: number;
  animateOnMount?: boolean;
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
  distance = 34,
  animateOnMount = false,
  children,
}: SlidePanelProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const firstStep = useRef(true);
  const dirRef = useRef<SlideDirection>(direction);
  dirRef.current = direction;

  function slideIn(dir: SlideDirection) {
    const start = dir === 'back' ? -distance : distance;
    translateX.setValue(start);
    opacity.setValue(0.58);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 260,
        damping: 30,
        mass: 0.86,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  useLayoutEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      if (animateOnMount) {
        slideIn(dirRef.current);
      }
      return;
    }
    slideIn(dirRef.current);
  }, [animateOnMount, stepKey]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
      {children}
    </Animated.View>
  );
}
