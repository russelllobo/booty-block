import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, View } from 'react-native';

import { colors } from '../constants/theme';
import { getOnboardingResumeHref } from '../lib/onboardingProgress';
import { shouldShowReturnOffer } from '../lib/returnOffer';
import { screenTimeService } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

const splashLogo = require('../assets/splash-icon.png');

export default function Index() {
  const {
    hydrated,
    isSubscribed,
    onboardingComplete,
    subscriptionHydrated,
  } = useBootyblock();
  const linkingUrl = Linking.useLinkingURL();

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;

    let active = true;
    void (async () => {
      if (!onboardingComplete) {
        const href = await getOnboardingResumeHref();
        if (active) router.replace(href);
        return;
      }

      if (!isSubscribed && await shouldShowReturnOffer()) {
        if (active) router.replace('/return-offer');
        return;
      }

      const openedFromShield = Boolean(
        linkingUrl?.startsWith('device-activity://')
        || linkingUrl?.startsWith('bootyblock://unlock')
        || screenTimeService.consumeShieldOpenRequest(),
      );
      if (active) {
        router.replace(openedFromShield
          ? { pathname: '/(tabs)', params: { openUnlock: '1' } }
          : '/(tabs)');
      }
    })();

    return () => {
      active = false;
    };
  }, [
    hydrated,
    isSubscribed,
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
