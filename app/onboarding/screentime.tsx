import { router } from 'expo-router';
import { ArrowUp, LockKeyhole } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePostHog } from 'posthog-react-native';

import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { captureAnalytics, screenTimeStatusProperties } from '../../lib/analytics';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function ScreenTime() {
  const { screenTimeStatus, requestScreenTime } = useBootyblock();
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);
  const { height, width } = useWindowDimensions();
  const approved = screenTimeStatus === 'approved';
  const dialogWidth = Math.min(width * 0.78, width - 64);
  const dialogHeight = dialogWidth * (682 / 938);
  const dialogTopGap = Math.min(92, Math.max(56, height * 0.085));
  const arrowBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (approved) {
      router.replace('/onboarding/notifications');
    }
  }, [approved]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowBounce, {
          toValue: -10,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(arrowBounce, {
          toValue: 0,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [arrowBounce]);

  async function request() {
    if (approved) {
      router.replace('/onboarding/notifications');
      return;
    }
    captureAnalytics(posthog, 'screen_time_permission_started');
    setLoading(true);
    const status = await requestScreenTime();
    setLoading(false);
    captureAnalytics(posthog, 'screen_time_permission_finished', screenTimeStatusProperties(status));
    if (status === 'approved') {
      router.replace('/onboarding/notifications');
    }
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={24} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1">
          <View>
            <Text className="text-[28px] font-bold leading-[33px] text-cocoa">
              Connect Bootyblock to Screen Time, Securely.
            </Text>
            <Text className="mt-2 text-base font-semibold leading-6 text-mink">
              To analyze your Screen Time on this iPhone, Bootyblock will need your permission.
            </Text>
          </View>

          <View className="flex-1 py-3">
            <View className="items-center">
              <View style={{ height: dialogHeight, marginTop: dialogTopGap, width: dialogWidth }}>
                <Image
                  source={require('../../assets/onboarding/screen-time-dialog-crop.png')}
                  accessibilityLabel="Example Screen Time access prompt"
                  resizeMode="contain"
                  style={styles.promptImage}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to Screen Time permission"
                  disabled={loading}
                  onPress={request}
                  style={styles.promptContinueTarget}
                />
              </View>
              <Animated.View
                className="mt-3"
                style={[
                  styles.promptArrow,
                  { width: dialogWidth, transform: [{ translateY: arrowBounce }] },
                ]}
              >
                <ArrowUp size={64} stroke={colors.raspberry} strokeWidth={2.8} />
              </Animated.View>

              <View className="mt-5 w-full rounded-[24px] bg-petal/70 p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                    <LockKeyhole size={20} stroke={colors.raspberry} strokeWidth={2.4} />
                  </View>
                  <Text className="flex-1 text-sm font-bold leading-5 text-cocoa">
                    Your sensitive data is protected by Apple and never leaves your device.
                  </Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promptImage: {
    height: '100%',
    width: '100%',
  },
  promptContinueTarget: {
    bottom: '12%',
    height: '20%',
    left: '5%',
    position: 'absolute',
    width: '44%',
  },
  promptArrow: {
    alignItems: 'flex-start',
    paddingLeft: '14%',
  },
});
