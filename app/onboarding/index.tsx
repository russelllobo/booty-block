import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { BrandLockup } from '../../components/BrandLockup';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { shadow } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const SKIP_ONBOARDING_TAPS = 5;
const TAP_RESET_MS = 1200;

export default function Onboarding() {
  const { height } = useWindowDimensions();
  const { completeOnboarding } = useBootyblock();
  const skipTapCountRef = useRef(0);
  const skipTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoHeight = Math.min(410, Math.max(260, height * 0.44));

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

  useEffect(() => {
    const source = Image.resolveAssetSource(require('../../assets/onboarding/slide-two.jpg'));
    if (source?.uri) {
      void Image.prefetch(source.uri);
    }
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
            className="overflow-hidden rounded-[34px] border border-white/80 bg-black"
            style={[{ height: demoHeight }, shadow]}
          >
            <View className="flex-1 bg-black" />
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
                onPress={() => router.push('/onboarding/permissions')}
              />
            </View>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
