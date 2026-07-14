import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  distance = 28,
  children,
}: SlidePanelProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const previousKey = useRef(stepKey);
  const latestChildren = useRef(children);
  const outgoingChildren = useRef<ReactNode>(null);
  const transitionDirection = useSharedValue<1 | -1>(direction === 'back' ? -1 : 1);
  const [showOutgoing, setShowOutgoing] = useState(false);

  const stepChanged = !Object.is(previousKey.current, stepKey);
  if (stepChanged) {
    outgoingChildren.current = latestChildren.current;
    previousKey.current = stepKey;
  }
  latestChildren.current = children;

  useLayoutEffect(() => {
    if (!stepChanged || reduceMotion) {
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
  }, [direction, progress, reduceMotion, stepKey, transitionDirection]);

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.72, 1], [0.12, 0.94, 1]),
    transform: [
      { translateX: (1 - progress.value) * distance * transitionDirection.value },
      { scale: interpolate(progress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.82, 1], [1, 0.18, 0]),
    transform: [
      { translateX: progress.value * distance * -0.32 * transitionDirection.value },
      { scale: interpolate(progress.value, [0, 1], [1, 0.992]) },
    ],
  }));

  return (
    <Animated.View style={{ flex: 1 }}>
      {showOutgoing ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, outgoingStyle]}>
          {outgoingChildren.current}
        </Animated.View>
      ) : null}
      <Animated.View style={[{ flex: 1 }, incomingStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}
