import { router } from 'expo-router';
import { AppWindow, Clock, Dumbbell, Flame, LockKeyhole, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { ProgressPill } from '../../components/ProgressPill';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

function remainingLabel(endsAt: number) {
  const ms = Math.max(0, endsAt - Date.now());
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Home() {
  const { requestedMinutes, activeUnlock, selectedAppsConfigured, selectedAppsLabel, clearUnlockIfExpired } = useBootyblock();

  useEffect(() => {
    clearUnlockIfExpired();
    const interval = setInterval(clearUnlockIfExpired, 1000);
    return () => clearInterval(interval);
  }, [clearUnlockIfExpired]);

  const status = useMemo(() => {
    if (activeUnlock && activeUnlock.endsAt > Date.now()) return 'Unlocked';
    if (selectedAppsConfigured) return 'Blocked';
    return 'Setup needed';
  }, [activeUnlock, selectedAppsConfigured]);

  return (
    <Screen>
      <Header
        title="Bootyblock"
        subtitle="Squat first. Scroll after."
        logo
        settings={() => router.push('/(tabs)/settings')}
      />

      <View className="overflow-hidden rounded-[36px] bg-raspberry p-6">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-sm font-black uppercase tracking-[2px] text-petal">Current status</Text>
            <Text className="mt-2 text-5xl font-black text-white">{status}</Text>
          </View>
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Flame size={30} stroke={colors.white} />
          </View>
        </View>

        <View className="mt-8 flex-row gap-3">
          <View className="flex-1 rounded-[28px] bg-white/18 p-4">
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-petal">Time</Text>
            <Text className="mt-1 text-3xl font-black text-white">
              {activeUnlock ? remainingLabel(activeUnlock.endsAt) : `${requestedMinutes}m`}
            </Text>
          </View>
          <View className="flex-1 rounded-[28px] bg-white/18 p-4">
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-petal">Cost</Text>
            <Text className="mt-1 text-3xl font-black text-white">{requestedMinutes * MINUTES_TO_SQUATS}</Text>
          </View>
        </View>
      </View>

      <View className="my-4 flex-row gap-3">
        <View className="flex-1">
          <ProgressPill label="Selected" value={selectedAppsConfigured ? 'Ready' : 'None'} />
        </View>
        <View className="flex-1">
          <ProgressPill label="Rate" value="1:1" tone="mint" />
        </View>
      </View>

      <SectionPanel title="Blocked set" subtitle={selectedAppsLabel}>
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
            <AppWindow size={22} stroke={colors.raspberry} />
          </View>
          <Text className="flex-1 text-base font-bold leading-6 text-cocoa">
            When one of these apps opens, iOS shows the Bootyblock shield until you earn a session.
          </Text>
        </View>
      </SectionPanel>

      <View className="mt-auto gap-3 pt-6">
        <Button label="Earn minutes" icon={Dumbbell} onPress={() => router.push('/(tabs)/plan')} />
        {!selectedAppsConfigured ? (
          <Button label="Choose blocked apps" icon={LockKeyhole} variant="secondary" onPress={() => router.push('/onboarding/apps')} />
        ) : (
          <Button label="Adjust time" icon={Clock} variant="secondary" onPress={() => router.push('/(tabs)/plan')} />
        )}
      </View>
    </Screen>
  );
}
