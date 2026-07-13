import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '../components/Button';
import { PeachIcon } from '../components/PeachIcon';
import { Text } from '../components/AppText';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Success() {
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
          <PeachIcon size={66} />
        </View>
        <Text className="mt-8 text-center text-[28px] font-bold leading-[33px] text-cocoa">
          {`${requestedPeaches} Peaches earned`}
        </Text>
        <Text className="mt-3 text-center text-lg font-bold leading-7 text-mink">
          {`You now have ${peachBalance}.`}
        </Text>
      </View>

      <View className="gap-3">
        <Button
          label="Unlock apps"
          icon={Sparkles}
          onPress={() => router.replace({ pathname: '/(tabs)', params: { openUnlock: 'spend' } })}
        />
        <Button label="Earn more" variant="secondary" onPress={() => router.replace('/session')} />
      </View>
    </Screen>
  );
}
