import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, View } from 'react-native';

import { colors } from '../constants/theme';
import { screenTimeService } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

const splashLogo = require('../assets/splash-icon.png');

export default function Index() {
  const {
    hydrated,
    onboardingComplete,
    subscriptionHydrated,
  } = useBootyblock();
  const linkingUrl = Linking.useLinkingURL();

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;

    if (!onboardingComplete) {
      router.replace('/onboarding');
      return;
    }

    const openedFromShield = Boolean(
      linkingUrl?.startsWith('device-activity://')
      || linkingUrl?.startsWith('bootyblock://unlock')
      || screenTimeService.consumeShieldOpenRequest(),
    );
    router.replace(openedFromShield
      ? { pathname: '/(tabs)', params: { openUnlock: '1' } }
      : '/(tabs)');
  }, [
    hydrated,
    linkingUrl,
    onboardingComplete,
    subscriptionHydrated,
  ]);

  return <LaunchLogo />;
}

function LaunchLogo() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
      <Image
        source={splashLogo}
        resizeMode="contain"
        fadeDuration={0}
        accessibilityLabel="bootyblock logo"
        style={{ width: 160, height: 160 }}
      />
    </View>
  );
}
