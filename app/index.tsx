import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { BrandLockup } from '../components/BrandLockup';
import { colors } from '../constants/theme';
import { screenTimeService } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Index() {
  const {
    hydrated,
    onboardingComplete,
    timeBankSeconds,
    subscriptionHydrated,
    hasAppAccess,
    requestSubscriptionAccess,
  } = useBootyblock();
  const linkingUrl = Linking.useLinkingURL();
  const initialPaywallRequestedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;

    if (!onboardingComplete) {
      router.replace('/onboarding');
      return;
    }

    if (!hasAppAccess && !initialPaywallRequestedRef.current) {
      initialPaywallRequestedRef.current = true;
      void requestSubscriptionAccess().finally(() => router.replace('/(tabs)'));
      return;
    }

    if (initialPaywallRequestedRef.current) {
      router.replace('/(tabs)');
      return;
    }

    const openedFromShield = Boolean(
      linkingUrl?.startsWith('device-activity://')
      || linkingUrl?.startsWith('bootyblock://unlock')
      || screenTimeService.consumeShieldOpenRequest(),
    );
    router.replace(
      openedFromShield || timeBankSeconds > 0
        ? '/plan'
        : '/(tabs)',
    );
  }, [
    hasAppAccess,
    hydrated,
    linkingUrl,
    onboardingComplete,
    requestSubscriptionAccess,
    subscriptionHydrated,
    timeBankSeconds,
  ]);

  if (!hydrated || !subscriptionHydrated) {
    return <LoadingLockup />;
  }

  return <LoadingLockup />;
}

function LoadingLockup() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
      <BrandLockup height={42} label="BootyBlock logo" />
    </View>
  );
}
