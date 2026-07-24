import { ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../constants/theme';

export const ONBOARDING_TOTAL = 31;

let lastStep = 0;

type OnboardingProgressProps = {
  step: number;
  onBack?: () => void;
  showBar?: boolean;
  dark?: boolean;
};

function progressForStep(step: number) {
  return Math.min(1, Math.max(0, step / ONBOARDING_TOTAL));
}

export function OnboardingProgress({ step, onBack, showBar = true, dark = false }: OnboardingProgressProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(progressForStep(lastStep));

  useEffect(() => {
    const nextProgress = progressForStep(step);
    progress.value = reduceMotion
      ? nextProgress
      : withSpring(nextProgress, {
          stiffness: 190,
          damping: 25,
          mass: 0.72,
          overshootClamping: true,
        });
    lastStep = step;
  }, [progress, reduceMotion, step]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View className="mb-5 flex-row items-center gap-4">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className={[
            'h-11 w-11 items-center justify-center rounded-full',
            dark ? 'border border-white/25 bg-white/12' : 'bg-white/70',
          ].join(' ')}
        >
          <ChevronLeft size={24} stroke={dark ? colors.white : colors.cocoa} strokeWidth={2.4} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}

      {showBar ? (
        <View
          className={[
            'h-2 flex-1 overflow-hidden rounded-full',
            dark ? 'bg-white/20' : 'bg-petal',
          ].join(' ')}
        >
          <Animated.View
            style={[
              {
                height: 8,
                width: '100%',
                borderRadius: 5,
                backgroundColor: dark ? colors.bubble : colors.raspberry,
                transformOrigin: 'left center',
              },
              fillStyle,
            ]}
          />
        </View>
      ) : (
        <View className="flex-1" />
      )}
    </View>
  );
}
