import { router } from 'expo-router';
import { Asset } from 'expo-asset';
import { ArrowRight } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandLockup } from '../../components/BrandLockup';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { shadow } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const SKIP_ONBOARDING_TAPS = 5;
const TAP_RESET_MS = 1200;
const SQUATTING_DEMO_ASPECT_RATIO = 394 / 648;
const squattingDemo = require('../../assets/onboarding/squatting-cut.gif');
const squattingPoster = require('../../assets/onboarding/squatting-poster.jpg');
const slideTwoArtwork = require('../../assets/onboarding/slide-two.jpg');

export default function Onboarding() {
  const { height } = useWindowDimensions();
  const { completeOnboarding } = useBootyblock();
  const posthog = usePostHog();
  const skipTapCountRef = useRef(0);
  const skipTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideTwoPreloadRef = useRef<Promise<unknown> | null>(null);
  const demoHeight = Math.min(500, Math.max(340, height * 0.54));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding',
    'welcome',
    'Block your apps until you grow your booty',
    1,
    30,
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

  const preloadSlideTwo = useCallback(() => {
    if (!slideTwoPreloadRef.current) {
      const source = Image.resolveAssetSource(slideTwoArtwork);
      slideTwoPreloadRef.current = Promise.all([
        Asset.loadAsync(slideTwoArtwork),
        source?.uri ? Image.prefetch(source.uri) : Promise.resolve(false),
      ]).catch(() => undefined);
    }

    return slideTwoPreloadRef.current;
  }, []);

  const handleGetStarted = useCallback(() => {
    router.push('/onboarding/permissions');
  }, []);

  useEffect(() => {
    void preloadSlideTwo();
  }, [preloadSlideTwo]);

  useEffect(() => {
    return () => {
      if (skipTapTimerRef.current) {
        clearTimeout(skipTapTimerRef.current);
      }
    };
  }, []);

  return (
    <Screen scroll={false}>
      <SlidePanel>
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
            <Text className="px-10 text-center text-[28px] font-bold leading-[33px] text-cocoa">
              Block your apps until you{' '}
              <Text className="text-raspberry">grow your booty</Text>
            </Text>

            <View className="pt-5">
              <Button
                label="Get started"
                icon={ArrowRight}
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
