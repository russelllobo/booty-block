import { router, useLocalSearchParams } from 'expo-router';
import { LockKeyhole, Sparkles, Unlock } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '../components/Button';
import { PeachIcon } from '../components/PeachIcon';
import { Text } from '../components/AppText';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Success() {
  const params = useLocalSearchParams<{ purpose?: 'unlock' }>();
  const unlockedScheduledApps = params.purpose === 'unlock';
  const { peachBalance, requestedPeaches, subscriptionHydrated, isSubscribed } = useBootyblock();

  useEffect(() => {
    if (!subscriptionHydrated || isSubscribed) return;

    router.replace('/(tabs)');
  }, [isSubscribed, subscriptionHydrated]);

  if (!subscriptionHydrated || !isSubscribed) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <Sparkles size={42} stroke={colors.raspberry} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-mint">
          {unlockedScheduledApps ? <Unlock size={54} stroke={colors.cocoa} strokeWidth={2.8} /> : <PeachIcon size={66} />}
        </View>
        <Text className="mt-8 text-center text-[28px] font-bold leading-[33px] text-cocoa">
          {unlockedScheduledApps ? 'apps unlocked' : `${requestedPeaches} Peaches earned`}
        </Text>
        <Text className="mt-3 text-center text-lg font-bold leading-7 text-mink">
          {unlockedScheduledApps ? 'you’re free until your next booty lock.' : `You now have ${peachBalance}.`}
        </Text>
      </View>

      <View className="gap-3">
        {unlockedScheduledApps ? (
          <>
            <Button label="done" icon={Sparkles} onPress={() => router.replace('/(tabs)')} />
            <Button label="view lock list" icon={LockKeyhole} variant="secondary" onPress={() => router.replace('/(tabs)/lock-list')} />
          </>
        ) : (
          <>
            <Button label="done" icon={Sparkles} onPress={() => router.replace('/(tabs)')} />
            <Button label="Earn more" variant="secondary" onPress={() => router.replace('/session')} />
          </>
        )}
      </View>
    </Screen>
  );
}
