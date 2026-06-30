import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { BrandLockup } from '../components/BrandLockup';
import { colors } from '../constants/theme';
import { screenTimeService } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Index() {
  const { hydrated, onboardingComplete, timeBankSeconds, subscriptionHydrated, hasAppAccess } = useBootyblock();
  const linkingUrl = Linking.useLinkingURL();

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;
    const openedFromShield = Boolean(
      linkingUrl?.startsWith('device-activity://')
      || linkingUrl?.startsWith('bootyblock://unlock')
      || screenTimeService.consumeShieldOpenRequest(),
    );
    router.replace(
      onboardingComplete && hasAppAccess
        ? openedFromShield
          || timeBankSeconds > 0
          ? '/(tabs)/plan'
          : '/(tabs)'
        : onboardingComplete
          ? '/onboarding/apps'
          : '/onboarding',
    );
  }, [hasAppAccess, hydrated, linkingUrl, onboardingComplete, subscriptionHydrated, timeBankSeconds]);

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
