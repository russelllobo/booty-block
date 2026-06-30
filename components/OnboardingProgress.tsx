import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  View,
} from 'react-native';

import { colors } from '../constants/theme';

export const ONBOARDING_TOTAL = 28;

let lastStep = 0;

function springToStep(
  fillWidth: Animated.Value,
  trackWidth: number,
  fromStep: number,
  toStep: number,
) {
  const fromPos = (fromStep / ONBOARDING_TOTAL) * trackWidth;
  const toPos = (toStep / ONBOARDING_TOTAL) * trackWidth;
  fillWidth.setValue(fromPos);
  Animated.spring(fillWidth, {
    toValue: toPos,
    useNativeDriver: false,
    stiffness: 150,
    damping: 18,
    mass: 0.8,
  }).start();
}

type OnboardingProgressProps = {
  step: number;
  onBack?: () => void;
  showBar?: boolean;
  dark?: boolean;
};

export function OnboardingProgress({ step, onBack, showBar = true, dark = false }: OnboardingProgressProps) {
  const trackWidth = useRef(0);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const didLayout = useRef(false);

  useEffect(() => {
    if (didLayout.current && trackWidth.current > 0) {
      springToStep(fillWidth, trackWidth.current, lastStep, step);
      lastStep = step;
    }
  }, [step, fillWidth]);

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    trackWidth.current = w;
    if (!didLayout.current) {
      didLayout.current = true;
      springToStep(fillWidth, w, lastStep, step);
      lastStep = step;
    } else {
      fillWidth.setValue((step / ONBOARDING_TOTAL) * w);
    }
  }

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
          onLayout={handleLayout}
          className={[
            'h-2 flex-1 overflow-hidden rounded-full',
            dark ? 'bg-white/20' : 'bg-petal',
          ].join(' ')}
        >
          <Animated.View
            style={{
              height: 8,
              width: fillWidth,
              borderRadius: 5,
              backgroundColor: dark ? colors.bubble : colors.raspberry,
            }}
          />
        </View>
      ) : (
        <View className="flex-1" />
      )}
    </View>
  );
}
