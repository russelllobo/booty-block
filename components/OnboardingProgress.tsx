import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  View,
} from 'react-native';

import { colors } from '../constants/theme';

export const ONBOARDING_TOTAL = 11;

type OnboardingProgressProps = {
  step: number;
  onBack?: () => void;
};

export function OnboardingProgress({ step, onBack }: OnboardingProgressProps) {
  const trackWidth = useRef(0);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const didLayout = useRef(false);

  useEffect(() => {
    if (trackWidth.current > 0) {
      Animated.spring(fillWidth, {
        toValue: (step / ONBOARDING_TOTAL) * trackWidth.current,
        useNativeDriver: false,
        stiffness: 150,
        damping: 18,
        mass: 0.8,
      }).start();
    }
  }, [step, fillWidth]);

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    trackWidth.current = w;
    const target = (step / ONBOARDING_TOTAL) * w;
    if (!didLayout.current) {
      didLayout.current = true;
      Animated.timing(fillWidth, {
        toValue: target,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      fillWidth.setValue(target);
    }
  }

  return (
    <View className="mb-5 flex-row items-center gap-4">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/70"
        >
          <ChevronLeft size={24} stroke={colors.cocoa} strokeWidth={2.4} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}

      <View
        onLayout={handleLayout}
        className="h-2 flex-1 overflow-hidden rounded-full bg-petal"
      >
        <Animated.View
          style={{
            height: 8,
            width: fillWidth,
            borderRadius: 5,
            backgroundColor: colors.raspberry,
          }}
        />
      </View>
    </View>
  );
}
