import { createContext, ReactNode, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

export type SlideDirection = 'forward' | 'back';

type SlidePanelProps = {
  stepKey?: string | number;
  direction?: SlideDirection;
  distance?: number;
  animateOnMount?: boolean;
  children: ReactNode;
};

const TRANSITION_DURATION = 260;
const TRANSITION_EASING = Easing.bezier(0.22, 1, 0.36, 1);

type SlideTransitionLayer = {
  role: 'incoming' | 'outgoing';
  progress: SharedValue<number>;
  direction: SharedValue<1 | -1>;
  distance: number;
};

const SlideTransitionContext = createContext<SlideTransitionLayer | null>(null);

export function useSlideTransitionLayer() {
  return useContext(SlideTransitionContext);
}

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
  distance = 44,
  animateOnMount = false,
  children,
}: SlidePanelProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const firstRender = useRef(true);
  const previousKey = useRef(stepKey);
  const latestChildren = useRef(children);
  const outgoingChildren = useRef<ReactNode>(null);
  const transitionDirection = useSharedValue<1 | -1>(direction === 'back' ? -1 : 1);
  const [showOutgoing, setShowOutgoing] = useState(false);
  const incomingLayer = useMemo<SlideTransitionLayer>(() => ({
    role: 'incoming',
    progress,
    direction: transitionDirection,
    distance,
  }), [distance, progress, transitionDirection]);
  const outgoingLayer = useMemo<SlideTransitionLayer>(() => ({
    role: 'outgoing',
    progress,
    direction: transitionDirection,
    distance,
  }), [distance, progress, transitionDirection]);

  const stepChanged = !Object.is(previousKey.current, stepKey);
  if (stepChanged) {
    outgoingChildren.current = latestChildren.current;
    previousKey.current = stepKey;
  }
  latestChildren.current = children;

  useLayoutEffect(() => {
    const isFirstRender = firstRender.current;
    firstRender.current = false;
    const shouldAnimate = stepChanged || (isFirstRender && animateOnMount);

    if (!shouldAnimate || reduceMotion) {
      progress.value = 1;
      setShowOutgoing(false);
      return;
    }

    transitionDirection.value = direction === 'back' ? -1 : 1;
    setShowOutgoing(stepChanged);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: TRANSITION_DURATION, easing: TRANSITION_EASING },
      (finished) => {
        if (finished) runOnJS(setShowOutgoing)(false);
      },
    );
  }, [animateOnMount, direction, progress, reduceMotion, stepKey, transitionDirection]);

  const incomingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - progress.value) * distance * transitionDirection.value },
    ],
  }));

  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.82, 1], [1, 0.18, 0]),
    transform: [
      { translateX: progress.value * distance * -0.32 * transitionDirection.value },
    ],
  }));

  return (
    <Animated.View style={{ flex: 1 }}>
      {showOutgoing ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, outgoingStyle]}>
          <SlideTransitionContext.Provider value={outgoingLayer}>
            {outgoingChildren.current}
          </SlideTransitionContext.Provider>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ flex: 1 }, incomingStyle]}>
        <SlideTransitionContext.Provider value={incomingLayer}>
          {children}
        </SlideTransitionContext.Provider>
      </Animated.View>
    </Animated.View>
  );
}
