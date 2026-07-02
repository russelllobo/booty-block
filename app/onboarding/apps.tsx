import { DeviceActivitySelectionViewPersisted } from 'react-native-device-activity';
import { router } from 'expo-router';
import { AppWindow, Check } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { SELECTION_ID } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import {
  captureAnalytics,
  selectionAnalyticsProperties,
  useOnboardingStepAnalytics,
} from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
} from '../../lib/services/screenTime';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Apps() {
  const {
    completeOnboarding,
    requestSubscriptionAccess,
    markSelectionConfigured,
    onboardingComplete,
    hasAppAccess,
    isSubscribed,
    subscriptionHydrated,
    subscriptionConfigured,
    subscriptionError,
    screenTimeStatus,
  } = useBootyblock();
  const posthog = usePostHog();
  const webPreview = Platform.OS === 'web';
  const nativePickerReady = Platform.OS === 'ios' && screenTimeService.isAvailable() && screenTimeStatus === 'approved';
  const [selectionSummary, setSelectionSummary] = useState<ScreenTimeSelectionSummary | null>(
    webPreview ? { applicationCount: 3, categoryCount: 1, webDomainCount: 0 } : null,
  );
  const [subscriptionGateReady, setSubscriptionGateReady] = useState(webPreview);
  const [subscriptionGateBusy, setSubscriptionGateBusy] = useState(false);
  const hasSelection = Boolean(selectionSummary);

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/apps',
    ONBOARDING_STEPS.blockedAppsPicker.key,
    ONBOARDING_STEPS.blockedAppsPicker.title,
    ONBOARDING_STEPS.blockedAppsPicker.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    if (nativePickerReady) {
      setSelectionSummary(screenTimeService.getSelectionSummary());
    }
  }, [nativePickerReady]);

  async function openSubscriptionGate() {
    setSubscriptionGateBusy(true);
    const subscribed = await requestSubscriptionAccess();
    setSubscriptionGateBusy(false);
    if (subscribed) {
      setSubscriptionGateReady(true);
      return;
    }
    router.replace('/(tabs)');
  }

  useEffect(() => {
    if (webPreview) {
      setSubscriptionGateReady(true);
      return;
    }

    if (!subscriptionHydrated) return;

    if (isSubscribed) {
      setSubscriptionGateReady(true);
      return;
    }

    setSubscriptionGateReady(false);
  }, [isSubscribed, subscriptionHydrated, webPreview]);

  async function save() {
    if (!hasAppAccess) {
      setSubscriptionGateReady(false);
      await openSubscriptionGate();
      return;
    }

    const configured = await markSelectionConfigured();
    if (!configured) {
      captureAnalytics(posthog, 'blocked_apps_selection_save_failed');
      Alert.alert(
        'Choose at least one app',
        'Select an app, category, or website in Apple’s picker before continuing.',
      );
      return;
    }
    captureAnalytics(posthog, 'blocked_apps_selected', selectionAnalyticsProperties(selectionSummary));
    if (onboardingComplete && isSubscribed) {
      router.replace('/(tabs)');
      return;
    }

    if (!onboardingComplete) {
      await completeOnboarding();
    }
    router.replace('/(tabs)');
  }

  if (!subscriptionGateReady) {
    return (
      <Screen>
        <SlidePanel>
          <View className="flex-1 justify-center gap-6">
            <Header title="Bootyblock Pro" subtitle="Subscribe before choosing the apps Bootyblock should protect." />

            <View className="items-center gap-5 rounded-[28px] bg-white/75 p-7">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-petal">
                {subscriptionGateBusy ? (
                  <ActivityIndicator color={colors.raspberry} />
                ) : (
                  <AppWindow size={34} stroke={colors.raspberry} />
                )}
              </View>
              <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">
                {subscriptionGateBusy ? 'Opening subscription' : 'Subscription needed'}
              </Text>
              <Text className="text-center text-base font-semibold leading-6 text-mink">
                {subscriptionConfigured
                  ? 'The app picker opens right after Bootyblock Pro is active.'
                  : subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.'}
              </Text>
            </View>

            <View className="mt-auto">
              <Button
                label={subscriptionGateBusy ? 'Opening paywall' : 'Continue'}
                icon={Check}
                disabled={subscriptionGateBusy}
                loading={subscriptionGateBusy}
                onPress={openSubscriptionGate}
              />
            </View>
          </View>
        </SlidePanel>
      </Screen>
    );
  }

  return (
    <Screen>
      <SlidePanel>
        <View className="flex-1">
          <Header title="Blocked apps" subtitle="Pick the apps that should make you squat before scrolling." />

          <View className="min-h-[520px] flex-1 overflow-hidden rounded-[28px] bg-white/75">
            {nativePickerReady ? (
              <DeviceActivitySelectionViewPersisted
                familyActivitySelectionId={SELECTION_ID}
                includeEntireCategory
                headerText="Choose apps for Bootyblock"
                footerText="You can change this later in Settings."
                onSelectionChange={(event) => {
                  const metadata = event.nativeEvent;
                  const nextSummary = {
                    applicationCount: metadata.applicationCount,
                    categoryCount: metadata.categoryCount,
                    webDomainCount: metadata.webDomainCount,
                    applications: metadata.applications ?? [],
                  };
                  const hasItems =
                    nextSummary.applicationCount +
                      nextSummary.categoryCount +
                      nextSummary.webDomainCount >
                    0;
                  setSelectionSummary(hasItems ? nextSummary : null);
                }}
                style={{ flex: 1, width: '100%', minHeight: 520 }}
              />
            ) : webPreview ? (
              <View className="flex-1 justify-center gap-4 p-6">
                <View className="flex-row flex-wrap justify-center gap-3">
                  {['TikTok', 'Instagram', 'YouTube'].map((label) => (
                    <View key={label} className="items-center gap-2">
                      <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-petal">
                        <AppWindow size={28} stroke={colors.raspberry} />
                      </View>
                      <Text className="text-xs font-black text-cocoa">{label}</Text>
                    </View>
                  ))}
                </View>
                <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">Browser preview selection</Text>
                <Text className="text-center text-base font-semibold leading-6 text-mink">
                  The native iOS picker appears on device. In the browser, this preview selection lets you continue through onboarding.
                </Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center gap-4 p-6">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-petal">
                  <AppWindow size={34} stroke={colors.raspberry} />
                </View>
                <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">Screen Time access needed</Text>
                <Text className="text-center text-base font-semibold leading-6 text-mink">
                  Apple’s app picker appears after Screen Time access is approved on a supported iPhone. You can review access and try again from Settings.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-auto pt-6">
            {nativePickerReady || webPreview ? (
              <Button
                label={hasSelection ? (onboardingComplete && isSubscribed ? 'Save blocked apps' : 'Finish setup') : 'Choose at least one app'}
                icon={Check}
                disabled={!hasSelection}
                onPress={save}
              />
            ) : (
              <Button
                label="Review Screen Time access"
                icon={AppWindow}
                onPress={() => router.push('/onboarding/screentime')}
              />
            )}
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
