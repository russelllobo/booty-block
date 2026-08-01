import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
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
  const showOutgoing = useRef(false);
  const transitionGeneration = useRef(0);
  const [, renderTransitionState] = useReducer((version: number) => version + 1, 0);
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
    showOutgoing.current = true;
  }
  latestChildren.current = children;

  const finishTransition = useCallback((generation: number) => {
    if (transitionGeneration.current !== generation || !showOutgoing.current) return;
    showOutgoing.current = false;
    renderTransitionState();
  }, []);

  useLayoutEffect(() => {
    const isFirstRender = firstRender.current;
    firstRender.current = false;
    const shouldAnimate = stepChanged || (isFirstRender && animateOnMount);

    if (!shouldAnimate || reduceMotion) {
      transitionGeneration.current += 1;
      progress.value = 1;
      if (showOutgoing.current) {
        showOutgoing.current = false;
        renderTransitionState();
      }
      return;
    }

    const generation = transitionGeneration.current + 1;
    transitionGeneration.current = generation;
    transitionDirection.value = direction === 'back' ? -1 : 1;
    progress.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(
        1,
        { duration: TRANSITION_DURATION, easing: TRANSITION_EASING },
        (finished) => {
          if (finished) runOnJS(finishTransition)(generation);
        },
      ),
    );
  }, [
    animateOnMount,
    direction,
    finishTransition,
    progress,
    reduceMotion,
    stepKey,
    transitionDirection,
  ]);

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
      {showOutgoing.current ? (
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
