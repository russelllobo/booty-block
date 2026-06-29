import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { screenTimeService } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Index() {
  const { hydrated, onboardingComplete, timeBankSeconds, subscriptionHydrated, isSubscribed } = useBootyblock();
  const linkingUrl = Linking.useLinkingURL();

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;
    const openedFromShield = Boolean(
      linkingUrl?.startsWith('device-activity://')
      || linkingUrl?.startsWith('bootyblock://unlock')
      || screenTimeService.consumeShieldOpenRequest(),
    );
    router.replace(
      onboardingComplete && isSubscribed
        ? openedFromShield
          || timeBankSeconds > 0
          ? '/(tabs)/plan'
          : '/(tabs)'
        : '/onboarding',
    );
  }, [hydrated, isSubscribed, linkingUrl, onboardingComplete, subscriptionHydrated, timeBankSeconds]);

  if (!hydrated || !subscriptionHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
        <ActivityIndicator color={colors.raspberry} />
        <Text style={{ marginTop: 16, color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>
          Loading Bootyblock...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
      <ActivityIndicator color={colors.raspberry} />
      <Text style={{ marginTop: 16, color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>
        Opening Bootyblock...
      </Text>
    </View>
  );
}
