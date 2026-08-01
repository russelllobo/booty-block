import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowUp, Bell } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import {
  colors,
  onboardingLightBackground,
  onboardingLightGradient,
} from '../../constants/theme';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { syncRoutineReminderNotification } from '../../lib/services/routineReminder';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type NotificationPermissionContentProps = {
  onBack: () => void;
  onComplete?: () => void;
};

export function NotificationPermissionContent({
  onBack,
  onComplete = () => router.replace('/onboarding/social-proof'),
}: NotificationPermissionContentProps) {
  const posthog = usePostHog();
  const { routineReminderTime } = useBootyblock();
  const [loading, setLoading] = useState(false);
  const { height, width } = useWindowDimensions();
  const promptRowWidth = Math.min(width - 40, 360);
  const dialogWidth = Math.min(width * 0.7, promptRowWidth - 62);
  const dialogHeight = dialogWidth * (970 / 950);
  const dialogTopGap = Math.min(42, Math.max(18, height * 0.035));
  const arrowBounce = useRef(new Animated.Value(0)).current;

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/notifications',
    ONBOARDING_STEPS.notificationPermission.key,
    ONBOARDING_STEPS.notificationPermission.title,
    ONBOARDING_STEPS.notificationPermission.index,
    ONBOARDING_STEP_TOTAL,
  );

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

  async function requestNotifications() {
    captureAnalytics(posthog, 'notification_permission_started');
    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Bootyblock notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.bubble,
        });
      }

      if (Platform.OS !== 'web') {
        const result = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: false, allowSound: true },
        });
        captureAnalytics(posthog, 'notification_permission_finished', {
          status: result.status,
          granted: result.granted,
        });
        if (result.granted) {
          await syncRoutineReminderNotification(routineReminderTime).catch((error) => {
            if (__DEV__) {
              console.warn('Unable to schedule the daily routine reminder', error);
            }
          });
        }
      } else {
        captureAnalytics(posthog, 'notification_permission_finished', {
          status: 'web_skipped',
          granted: false,
        });
      }
    } finally {
      setLoading(false);
      onComplete();
    }
  }

  return (
    <>
      <StatusBar style="dark" animated />
      <OnboardingProgress
        step={ONBOARDING_STEPS.notificationPermission.index}
        onBack={onBack}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1 justify-between">
          <View className="pt-8">
            <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">
              allow Booty Block to send you notifications
            </Text>
            <Text
              className="mt-2 self-center text-center text-base font-semibold leading-6 text-mink"
              style={styles.supportingCopy}
            >
              we use this to let you unlock your apps when you want to use them.
            </Text>
          </View>

          <View className="items-center">
            <View style={{ height: dialogHeight, marginTop: dialogTopGap, width: promptRowWidth }}>
              <View style={{ height: dialogHeight, width: dialogWidth }}>
                <Image
                  source={require('../../assets/onboarding/notification-dialog-crop.png')}
                  accessibilityLabel="Example notification permission prompt"
                  resizeMode="contain"
                  style={styles.promptImage}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to notification permission"
                  disabled={loading}
                  onPress={requestNotifications}
                  style={styles.promptAllowTarget}
                />
              </View>
              <Animated.View
                style={[
                  styles.promptArrow,
                  {
                    left: dialogWidth + 4,
                    top: dialogHeight * 0.43,
                    transform: [{ translateX: arrowBounce }, { rotate: '-90deg' }],
                  },
                ]}
              >
                <ArrowUp size={56} stroke={colors.raspberry} strokeWidth={2.8} />
              </Animated.View>
            </View>
          </View>

          <View>
            <Button
              label="continue"
              icon={Bell}
              loading={loading}
              onPress={requestNotifications}
            />
          </View>
        </View>
      </SlidePanel>
    </>
  );
}

export default function NotificationPermission() {
  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <NotificationPermissionContent onBack={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  promptImage: {
    height: '100%',
    width: '100%',
  },
  promptAllowTarget: {
    height: '13%',
    left: '7%',
    position: 'absolute',
    top: '46%',
    width: '86%',
  },
  promptArrow: {
    position: 'absolute',
  },
  supportingCopy: {
    maxWidth: 270,
  },
});
