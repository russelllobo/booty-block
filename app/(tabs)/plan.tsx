import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock3, Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { Screen } from '../../components/Screen';
import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Plan() {
  const {
    requestedMinutes,
    setRequestedMinutes,
    timeBankSeconds,
    useBankedTime,
    isSubscribed,
    subscriptionConfigured,
    subscriptionError,
    presentSubscriptionPaywall,
  } = useBootyblock();
  const params = useLocalSearchParams<{ mode?: string }>();
  const hasBank = timeBankSeconds > 0;
  const maxSpendMinutes = Math.max(1, Math.ceil(timeBankSeconds / 60));
  const [mode, setMode] = useState<'spend' | 'earn'>(hasBank && params.mode !== 'earn' ? 'spend' : 'earn');
  const [spendMinutes, setSpendMinutes] = useState(Math.min(10, maxSpendMinutes));
  const [spending, setSpending] = useState(false);
  const earningTarget = requestedMinutes * MINUTES_TO_SQUATS;
  const spendTarget = Math.min(spendMinutes, maxSpendMinutes);
  const sliderMinutes = mode === 'spend' ? spendTarget : requestedMinutes;
  const sliderMax = mode === 'spend' ? maxSpendMinutes : 60;
  const title = mode === 'spend' ? 'Use banked time' : 'Bank app time';
  const subtitle = mode === 'spend'
    ? 'Choose how many minutes to use your blocked apps for.'
    : 'Choose how much time to earn, then pay in squats.';
  const primaryLabel = mode === 'spend' ? `Use ${spendTarget} min` : `Start ${earningTarget} squats`;
  const primaryIcon = mode === 'spend' ? Clock3 : Dumbbell;

  useEffect(() => {
    if (!hasBank && mode === 'spend') {
      setMode('earn');
    }
  }, [hasBank, mode]);

  useEffect(() => {
    setSpendMinutes((current) => Math.min(Math.max(1, current), maxSpendMinutes));
  }, [maxSpendMinutes]);

  function updateSliderMinutes(minutes: number) {
    if (mode === 'spend') {
      setSpendMinutes(Math.min(maxSpendMinutes, Math.max(1, minutes)));
      return;
    }

    setRequestedMinutes(minutes);
  }

  async function handlePrimaryPress() {
    if (!isSubscribed) {
      const subscribed = await presentSubscriptionPaywall();
      if (!subscribed) {
        Alert.alert(
          subscriptionConfigured ? 'Subscription needed' : 'RevenueCat setup needed',
          subscriptionConfigured
            ? 'Subscribe to unlock Bootyblock app blocking and squat-to-unlock sessions.'
            : subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
        return;
      }
    }

    if (mode === 'spend') {
      setSpending(true);
      try {
        const started = await useBankedTime(spendTarget);
        if (started) {
          router.replace('/(tabs)');
        }
      } finally {
        setSpending(false);
      }
      return;
    }

    router.push('/session');
  }

  return (
    <Screen>
      <Header title={title} subtitle={subtitle} />

      {hasBank ? (
        <View className="mb-3 flex-row rounded-full bg-white/70 p-1">
          {(['spend', 'earn'] as const).map((option) => {
            const active = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(option)}
                className={['min-h-11 flex-1 items-center justify-center rounded-full', active ? 'bg-raspberry' : 'bg-transparent'].join(' ')}
              >
                <Text className={['text-sm font-black', active ? 'text-white' : 'text-mink'].join(' ')}>
                  {option === 'spend' ? 'Use time' : 'Earn more'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="items-center rounded-[32px] bg-white/70 p-5">
        <View className="my-3 h-[154px] items-center justify-center">
          <NativeRollingNumber
            value={sliderMinutes}
            color={colors.cocoa}
            fontSize={124}
            fontWeight="900"
            style={{ width: 240, height: 132 }}
          />
          <Text
            className="-mt-3 text-center font-black uppercase text-raspberry"
            style={{ fontSize: 30, letterSpacing: 1.5, lineHeight: 34 }}
          >
            minutes
          </Text>
        </View>

        <View className="mt-4 w-full">
          <Slider
            accessibilityLabel={mode === 'spend' ? 'Minutes to use from bank' : 'Minutes to bank for blocked apps'}
            accessibilityValue={{
              min: 1,
              max: sliderMax,
              now: sliderMinutes,
              text: `${sliderMinutes} minutes`,
            }}
            minimumValue={1}
            maximumValue={sliderMax}
            step={1}
            value={sliderMinutes}
            onValueChange={updateSliderMinutes}
            minimumTrackTintColor={colors.raspberry}
            maximumTrackTintColor={colors.petal}
            thumbTintColor={colors.raspberry}
          />
          <View className="mt-1 flex-row justify-between px-1">
            <Text className="text-xs font-black text-mink">1 min</Text>
            <Text className="text-xs font-black text-mink">{sliderMax} min</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-[24px] border border-white/70 bg-white/65 p-4">
        <Text className="text-lg font-black text-cocoa">The rule</Text>
        <Text className="mt-1 text-sm font-semibold leading-5 text-mink">
          {mode === 'spend'
            ? 'Selected minutes leave your bank, then blocked apps open until time runs out.'
            : 'One minute costs one squat. Banked time waits until you choose to use it.'}
        </Text>
      </View>

      {!isSubscribed ? (
        <View className="mt-4 rounded-[24px] border border-white/70 bg-white/65 p-4">
          <Text className="text-lg font-black text-cocoa">Bootyblock Pro</Text>
          <Text className="mt-1 text-sm font-semibold leading-5 text-mink">
            A subscription keeps app blocking, squat sessions, progress stats, and unlock windows active on this iPhone.
          </Text>
        </View>
      ) : null}

      <View className="mt-auto pt-4">
        <Button label={primaryLabel} icon={primaryIcon} onPress={handlePrimaryPress} loading={spending} />
      </View>
    </Screen>
  );
}
