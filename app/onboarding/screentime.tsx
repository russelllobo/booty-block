import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowUp, LockKeyhole } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePostHog } from 'posthog-react-native';

import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import {
  captureAnalytics,
  screenTimeStatusProperties,
  useOnboardingStepAnalytics,
} from '../../lib/analytics';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { NotificationPermissionContent } from './notifications';

type PermissionStep = 'screentime' | 'notifications';

const notificationBackground = '#07070A';
const notificationGradient = ['#3A0F26', '#07070A'] as const;

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
  const [permissionStep, setPermissionStep] = useState<PermissionStep>(
    approved ? 'notifications' : 'screentime',
  );
  const permissionStepIndex = permissionStep === 'notifications' ? 1 : 0;
  const direction = useStepDirection(permissionStepIndex);

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/screentime',
    'screen_time_permission',
    'Connect Bootyblock to Screen Time, Securely.',
    28,
    32,
  );

  useEffect(() => {
    Image.prefetch(
      Image.resolveAssetSource(require('../../assets/onboarding/notification-dialog-crop.png')).uri,
    );
  }, []);

  useEffect(() => {
    if (permissionStep !== 'screentime') {
      arrowBounce.setValue(0);
      return;
    }

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
  }, [arrowBounce, permissionStep]);

  async function request() {
    if (approved) {
      setPermissionStep('notifications');
      return;
    }
    captureAnalytics(posthog, 'screen_time_permission_started');
    setLoading(true);
    const status = await requestScreenTime();
    setLoading(false);
    captureAnalytics(posthog, 'screen_time_permission_finished', screenTimeStatusProperties(status));
    if (status === 'approved') {
      setPermissionStep('notifications');
    }
  }

  function back() {
    if (permissionStep === 'notifications') {
      setPermissionStep('screentime');
      return;
    }
    router.back();
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={permissionStep === 'notifications' ? notificationBackground : undefined}
      backgroundGradient={permissionStep === 'notifications' ? notificationGradient : undefined}
    >
      {permissionStep === 'notifications' ? (
        <NotificationPermissionContent onBack={back} />
      ) : (
        <>
          <StatusBar style="dark" animated />
          <OnboardingProgress step={24} onBack={back} />

          <SlidePanel stepKey={permissionStep} direction={direction}>
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
        </>
      )}
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
