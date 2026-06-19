import { router } from 'expo-router';
import { Dumbbell, Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { MINUTES_TO_SQUATS, minuteOptions } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Plan() {
  const { requestedMinutes, setRequestedMinutes } = useBootyblock();
  const target = requestedMinutes * MINUTES_TO_SQUATS;

  return (
    <Screen>
      <Header title="Earn a scroll" subtitle="Choose how long you want, then pay in squats." />

      <View className="items-center rounded-[38px] bg-white/70 p-8">
        <Text className="text-sm font-black uppercase tracking-[2px] text-mink">Unlock time</Text>
        <View className="my-6 flex-row items-center gap-8">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease minutes"
            onPress={() => setRequestedMinutes(Math.max(1, requestedMinutes - 1))}
            className="h-14 w-14 items-center justify-center rounded-full bg-petal"
          >
            <Minus size={24} stroke={colors.raspberry} />
          </Pressable>
          <Text className="min-w-[150px] text-center text-7xl font-black text-cocoa">{requestedMinutes}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase minutes"
            onPress={() => setRequestedMinutes(Math.min(60, requestedMinutes + 1))}
            className="h-14 w-14 items-center justify-center rounded-full bg-petal"
          >
            <Plus size={24} stroke={colors.raspberry} />
          </Pressable>
        </View>
        <Text className="text-xl font-black text-raspberry">{target} squats</Text>
      </View>

      <View className="my-5 flex-row flex-wrap gap-3">
        {minuteOptions.map((minutes) => (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            onPress={() => setRequestedMinutes(minutes)}
            className={[
              'h-14 min-w-[72px] flex-1 items-center justify-center rounded-full border px-4',
              requestedMinutes === minutes ? 'border-raspberry bg-raspberry' : 'border-white bg-white/70',
            ].join(' ')}
          >
            <Text className={['text-base font-black', requestedMinutes === minutes ? 'text-white' : 'text-cocoa'].join(' ')}>
              {minutes}m
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionPanel title="The rule" subtitle="MVP default is intentionally simple: one minute costs one squat. No confusing points, streaks, or hidden multipliers." />

      <View className="mt-auto pt-6">
        <Button label={`Start ${target} squats`} icon={Dumbbell} onPress={() => router.push('/session')} />
      </View>
    </Screen>
  );
}
