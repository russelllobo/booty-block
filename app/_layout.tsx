import '../global.css';

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import * as Updates from 'expo-updates';
import { Stack, usePathname } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandLockup } from '../components/BrandLockup';
import { colors } from '../constants/theme';
import {
  POSTHOG_API_KEY,
  POSTHOG_ENABLED,
  POSTHOG_HOST,
  screenAnalytics,
} from '../lib/analytics';
import { screenTimeService } from '../lib/services/screenTime';
import { BootyblockProvider, useBootyblock } from '../lib/store/BootyblockProvider';

const onboardingScreenOptions = {
  animation: 'slide_from_right',
  gestureEnabled: false,
} as const;

const UPDATE_CHECK_TIMEOUT_MS = 8000;
const QUICK_ACTIONS: QuickActions.Action[] = [
  {
    id: 'deleting-feedback',
    title: 'Deleting? Tell us why.',
    subtitle: 'Send us feedback before you delete',
    icon: 'symbol:square.and.pencil',
    params: { action: 'deleting-feedback' },
  },
  {
    id: 'discount-offer',
    title: '🎁 Get Bootyblock for a fraction of the price',
    subtitle: '80% off with this limited time offer',
    icon: 'symbol:gift',
    params: { action: 'discount-offer' },
  },
];
const FEEDBACK_DELETE_URL = 'mailto:russell@russell.systems?subject=Deleting%20Bootyblock%3F%20Tell%20us%20why';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

function UpdateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => __DEV__ || Platform.OS === 'web' || !Updates.isEnabled);

  useEffect(() => {
    if (ready) return;

    let cancelled = false;

    async function loadFreshUpdate() {
      try {
        const update = await withTimeout(Updates.checkForUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS);
        if (!update?.isAvailable || cancelled) {
          setReady(true);
          return;
        }

        const result = await withTimeout(Updates.fetchUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS);
        if (cancelled) return;

        if (result?.isNew) {
          await Updates.reloadAsync();
          return;
        }
      } catch (error) {
        console.warn('Unable to apply startup update', error);
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void loadFreshUpdate();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
        <BrandLockup height={42} label="BootyBlock logo" />
      </View>
    );
  }

  return children;
}

function NotificationObserver() {
  const { onboardingComplete } = useBootyblock();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openUnlockUrl(url: string | null) {
      const openedFromShield = Boolean(
        url?.startsWith('device-activity://')
        || url?.startsWith('bootyblock://unlock')
        || screenTimeService.consumeShieldOpenRequest(),
      );
      if (openedFromShield) {
        router.push(onboardingComplete ? '/plan' : '/onboarding');
      }
    }

    void Linking.getInitialURL().then(openUnlockUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => openUnlockUrl(url));

    return () => subscription.remove();
  }, [onboardingComplete]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && screenTimeService.consumeShieldOpenRequest()) {
        router.push(onboardingComplete ? '/plan' : '/onboarding');
      }
    });

    return () => subscription.remove();
  }, [onboardingComplete]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openNotification(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url === '/plan' || url === '/(tabs)/plan') {
        router.push('/plan');
      }
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      openNotification(lastResponse.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });

    return () => subscription.remove();
  }, []);

  return null;
}

function QuickActionObserver() {
  const { presentOneTimeOffer } = useBootyblock();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void QuickActions.setItems(QUICK_ACTIONS).catch((error) => {
      if (__DEV__) {
        console.warn('Unable to register quick actions', error);
      }
    });
  }, []);

  useQuickActionCallback((action) => {
    if (Platform.OS === 'web') return;

    if (action.id === 'deleting-feedback' || action.params?.action === 'deleting-feedback') {
      void Linking.openURL(FEEDBACK_DELETE_URL);
      return;
    }

    if (action.id === 'discount-offer' || action.params?.action === 'discount-offer') {
      void presentOneTimeOffer();
    }
  });

  return null;
}

function AnalyticsScreenTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    screenAnalytics(posthog, pathname);
  }, [pathname, posthog]);

  return null;
}

export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY ?? ''}
      options={{
        host: POSTHOG_HOST,
        captureAppLifecycleEvents: POSTHOG_ENABLED,
        enableSessionReplay: false,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <BootyblockProvider>
            <UpdateGate>
              <AnalyticsScreenTracker />
              <NotificationObserver />
              <QuickActionObserver />
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding/index" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/permissions" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/quiz" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/usage" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/insights" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/setup" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/calibration" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/activity" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/finish" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/screentime" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/notifications" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/calculating" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/wellbeing-plan" options={onboardingScreenOptions} />
                <Stack.Screen name="onboarding/apps" options={onboardingScreenOptions} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="plan" />
                <Stack.Screen name="statistics" />
                <Stack.Screen name="session" />
                <Stack.Screen name="success" />
              </Stack>
            </UpdateGate>
          </BootyblockProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
