import { router } from 'expo-router';
import { ArrowRight, Star } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/AppText';

import { BrandLockup } from '../../components/BrandLockup';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const SKIP_ONBOARDING_TAPS = 5;
const TAP_RESET_MS = 1200;
const SQUATTING_DEMO_ASPECT_RATIO = 394 / 648;
const squattingDemo = require('../../assets/onboarding/squatting-cut.gif');
const squattingPoster = require('../../assets/onboarding/squatting-poster.jpg');

export default function Onboarding() {
  const { height } = useWindowDimensions();
  const { completeOnboarding } = useBootyblock();
  const posthog = usePostHog();
  const skipTapCountRef = useRef(0);
  const skipTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoHeight = Math.min(500, Math.max(340, height * 0.54));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding',
    ONBOARDING_STEPS.welcome.key,
    ONBOARDING_STEPS.welcome.title,
    ONBOARDING_STEPS.welcome.index,
    ONBOARDING_STEP_TOTAL,
  );

  const handleLogoPress = useCallback(() => {
    if (!__DEV__) return;

    skipTapCountRef.current += 1;
    if (skipTapTimerRef.current) {
      clearTimeout(skipTapTimerRef.current);
    }

    if (skipTapCountRef.current >= SKIP_ONBOARDING_TAPS) {
      skipTapCountRef.current = 0;
      void completeOnboarding().then(() => router.replace('/(tabs)'));
      return;
    }

    skipTapTimerRef.current = setTimeout(() => {
      skipTapCountRef.current = 0;
      skipTapTimerRef.current = null;
    }, TAP_RESET_MS);
  }, [completeOnboarding]);

  const handleGetStarted = useCallback(() => {
    router.push('/onboarding/quiz');
  }, []);

  useEffect(() => {
    return () => {
      if (skipTapTimerRef.current) {
        clearTimeout(skipTapTimerRef.current);
      }
    };
  }, []);

  return (
    <Screen scroll={false}>
      <SlidePanel animateOnMount>
        <View className="flex-1">
          <View className="flex-row items-center justify-center gap-2 pb-5 pt-1">
            <Pressable
              accessibilityRole={__DEV__ ? 'button' : undefined}
              accessibilityLabel="BootyBlock logo"
              onPress={handleLogoPress}
              hitSlop={16}
            >
              <BrandLockup height={42} label="BootyBlock logo" />
            </Pressable>
          </View>

          <View
            className="overflow-hidden rounded-[34px]"
            style={[
              { alignSelf: 'center', aspectRatio: SQUATTING_DEMO_ASPECT_RATIO, height: demoHeight },
              shadow,
            ]}
          >
            <Image
              source={squattingPoster}
              accessibilityLabel="Squat demo"
              resizeMode="contain"
              style={styles.demoImage}
            />
            <Image
              source={squattingDemo}
              accessibilityLabel="Squat demo animation"
              resizeMode="contain"
              style={[styles.demoImage, styles.demoAnimation]}
            />
          </View>

          <View className="flex-1 justify-end pt-5">
            <View className="mb-4 flex-row items-center justify-center gap-1.5">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={19} stroke={colors.raspberry} fill={colors.raspberry} strokeWidth={2.4} />
              ))}
            </View>

            <Text className="px-10 text-center text-[28px] font-bold leading-[33px] text-cocoa">
              Block your apps until you{' '}
              <Text className="text-raspberry">grow your booty</Text>
            </Text>

            <View className="pt-5">
              <Button
                label="End my scroll habit"
                icon={ArrowRight}
                iconPosition="right"
                onPress={handleGetStarted}
              />
            </View>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoAnimation: {
    position: 'absolute',
  },
  demoImage: {
    height: '100%',
    width: '100%',
  },
});
