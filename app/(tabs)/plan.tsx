import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock3, Dumbbell, Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Plan() {
  const { requestedMinutes, setRequestedMinutes, timeBankSeconds, useBankedTime } = useBootyblock();
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
    ? 'Choose how many minutes to unlock now.'
    : 'Choose how much time to earn, then pay in squats.';
  const panelEyebrow = mode === 'spend' ? 'Spend time' : 'Bank time';
  const primaryLabel = mode === 'spend' ? `Use ${spendTarget} min` : `Start ${earningTarget} squats`;
  const primaryIcon = mode === 'spend' ? Clock3 : Dumbbell;
  const helperLabel = useMemo(() => {
    if (mode === 'spend') {
      const bankMinutes = Math.floor(timeBankSeconds / 60);
      const bankSeconds = timeBankSeconds % 60;
      return bankSeconds > 0 ? `${bankMinutes}m ${bankSeconds}s in your bank` : `${bankMinutes} minutes in your bank`;
    }

    return `${earningTarget} squats`;
  }, [earningTarget, mode, timeBankSeconds]);

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
        <View className="mb-4 flex-row rounded-full bg-white/70 p-1">
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

      <View className="items-center rounded-[38px] bg-white/70 p-8">
        <Text className="text-sm font-black uppercase tracking-[2px] text-mink">{panelEyebrow}</Text>
        <View className="my-6 flex-row items-center gap-8">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease minutes"
            onPress={() => updateSliderMinutes(Math.max(1, sliderMinutes - 1))}
            className="h-14 w-14 items-center justify-center rounded-full bg-petal"
          >
            <Minus size={24} stroke={colors.raspberry} />
          </Pressable>
          <Text className="min-w-[150px] text-center text-7xl font-black text-cocoa">{sliderMinutes}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase minutes"
            onPress={() => updateSliderMinutes(Math.min(sliderMax, sliderMinutes + 1))}
            className="h-14 w-14 items-center justify-center rounded-full bg-petal"
          >
            <Plus size={24} stroke={colors.raspberry} />
          </Pressable>
        </View>
        <Text className="text-xl font-black text-raspberry">{helperLabel}</Text>

        <View className="mt-7 w-full">
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

      <SectionPanel
        title="The rule"
        subtitle={mode === 'spend'
          ? 'The selected minutes are taken from your bank, then your blocked apps open until that usage runs out.'
          : 'One minute costs one squat. Banked time waits until you choose to use it.'}
      />

      <View className="mt-auto pt-6">
        <Button label={primaryLabel} icon={primaryIcon} onPress={handlePrimaryPress} loading={spending} />
      </View>
    </Screen>
  );
}
