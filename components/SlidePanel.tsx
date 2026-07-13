import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

export type SlideDirection = 'forward' | 'back';

type SlidePanelProps = {
  stepKey?: string | number;
  direction?: SlideDirection;
  distance?: number;
  animateOnMount?: boolean;
  children: ReactNode;
};

const GLASS_AVAILABLE = (() => {
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

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
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blurActive, setBlurActive] = useState(animateOnMount && GLASS_AVAILABLE);
  const dirRef = useRef<SlideDirection>(direction);
  dirRef.current = direction;

  function blurToSharp() {
    if (!GLASS_AVAILABLE) return;
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setBlurActive(true);
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      setBlurActive(false);
    }, 40);
  }

  function slideIn(dir: SlideDirection) {
    const start = dir === 'back' ? -distance : distance;
    blurToSharp();
    translateX.setValue(start);
    opacity.setValue(0.72);
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
        duration: 210,
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

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
      {children}
      {animateOnMount && GLASS_AVAILABLE ? (
        <GlassView
          pointerEvents="none"
          glassEffectStyle={{
            style: blurActive ? 'regular' : 'none',
            animate: true,
            animationDuration: 0.28,
          }}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
    </Animated.View>
  );
}
