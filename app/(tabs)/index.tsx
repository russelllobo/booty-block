import { router } from 'expo-router';
import { AppWindow, BarChart3, Dumbbell, Flame, FolderLock, Globe2, LockKeyhole, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { colors } from '../../constants/theme';
import type { UnlockHistoryEntry } from '../../lib/store/BootyblockProvider';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

function remainingLabel(endsAt: number, now: number) {
  const totalSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type StatsPeriod = 'daily' | 'weekly' | 'monthly';

type StatsBucket = {
  key: string;
  label: string;
  squats: number;
  minutes: number;
};

const periodLabels: Record<StatsPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function sameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function formatRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
  return `${startLabel}-${endLabel}`;
}

function getHistoryEntries(history: UnlockHistoryEntry[], start: Date, end: Date) {
  return history.filter((entry) => entry.completedAt >= start.getTime() && entry.completedAt < end.getTime());
}

function summarizeBucket(key: string, label: string, entries: UnlockHistoryEntry[]): StatsBucket {
  return {
    key,
    label,
    squats: entries.reduce((sum, entry) => sum + entry.squats, 0),
    minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
  };
}

function buildStatsBuckets(history: UnlockHistoryEntry[], period: StatsPeriod, now: number): StatsBucket[] {
  const today = startOfDay(now);

  if (period === 'daily') {
    return Array.from({ length: 7 }, (_, index) => {
      const start = addDays(today, index - 6);
      const end = addDays(start, 1);
      return summarizeBucket(
        start.toISOString(),
        sameDay(start, today) ? 'Today' : start.toLocaleDateString(undefined, { weekday: 'short' }),
        getHistoryEntries(history, start, end),
      );
    });
  }

  if (period === 'weekly') {
    return Array.from({ length: 6 }, (_, index) => {
      const start = addDays(today, (index - 5) * 7);
      const end = addDays(start, 7);
      return summarizeBucket(
        start.toISOString(),
        index === 5 ? 'This week' : formatRange(start, addDays(end, -1)),
        getHistoryEntries(history, start, end),
      );
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const end = addMonths(start, 1);
    return summarizeBucket(
      start.toISOString(),
      start.toLocaleDateString(undefined, { month: 'short' }),
      getHistoryEntries(history, start, end),
    );
  });
}

function StatisticsPanel({
  visible,
  history,
  now,
  onClose,
}: {
  visible: boolean;
  history: UnlockHistoryEntry[];
  now: number;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<StatsPeriod>('daily');
  const buckets = useMemo(() => buildStatsBuckets(history, period, now), [history, now, period]);
  const maxSquats = Math.max(1, ...buckets.map((bucket) => bucket.squats));
  const totalSquats = buckets.reduce((sum, bucket) => sum + bucket.squats, 0);
  const totalMinutes = buckets.reduce((sum, bucket) => sum + bucket.minutes, 0);
  const latest = history[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-blush px-6 pb-6 pt-16">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-sm font-black uppercase tracking-[2px] text-mink">Export Statistics</Text>
            <Text className="mt-2 text-[28px] font-bold leading-[33px] text-cocoa">Progress</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close statistics"
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
          >
            <X size={22} stroke={colors.cocoa} />
          </Pressable>
        </View>

        <View className="mt-6 flex-row rounded-full bg-white/80 p-1">
          {(Object.keys(periodLabels) as StatsPeriod[]).map((option) => {
            const active = period === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPeriod(option)}
                className={['min-h-11 flex-1 items-center justify-center rounded-full', active ? 'bg-raspberry' : 'bg-transparent'].join(' ')}
              >
                <Text className={['text-sm font-black', active ? 'text-white' : 'text-mink'].join(' ')}>
                  {periodLabels[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 rounded-[28px] bg-white/80 p-5">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">Squats</Text>
              <Text className="mt-1 text-4xl font-black text-cocoa">{totalSquats}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">Minutes</Text>
              <Text className="mt-1 text-4xl font-black text-raspberry">{totalMinutes}</Text>
            </View>
          </View>
          <Text className="mt-4 text-sm font-bold text-mink">
            {latest ? `Last workout ${new Date(latest.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No workouts logged yet'}
          </Text>
        </View>

        <View className="mt-5 flex-1 rounded-[28px] bg-white/80 p-5">
          <View className="h-64 flex-row items-end gap-2">
            {buckets.map((bucket) => {
              const height = `${Math.max(bucket.squats ? 8 : 2, (bucket.squats / maxSquats) * 100)}%` as DimensionValue;
              return (
                <View key={bucket.key} className="flex-1 items-center justify-end">
                  <Text className="mb-2 text-xs font-black text-cocoa">{bucket.squats}</Text>
                  <View className="h-full w-full justify-end rounded-full bg-petal/60">
                    <View className="w-full rounded-full bg-raspberry" style={{ height }} />
                  </View>
                </View>
              );
            })}
          </View>
          <View className="mt-3 flex-row gap-2">
            {buckets.map((bucket) => (
              <Text
                key={bucket.key}
                className="flex-1 text-center text-[10px] font-black text-mink"
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {bucket.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function Home() {
  const {
    activeUnlock,
    selectedAppsConfigured,
    selectedAppsLabel,
    selectionSummary,
    currentStreak,
    unlockHistory,
    clearUnlockIfExpired,
  } = useBootyblock();
  const [now, setNow] = useState(Date.now);
  const [statisticsVisible, setStatisticsVisible] = useState(false);

  useEffect(() => {
    clearUnlockIfExpired();
    if (!activeUnlock) return;

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
      clearUnlockIfExpired();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeUnlock, clearUnlockIfExpired]);

  const isUnlocked = Boolean(activeUnlock && activeUnlock.endsAt > now);

  const status = useMemo(() => {
    if (isUnlocked) return 'Unlocked';
    if (selectedAppsConfigured) return 'Blocked';
    return 'Setup needed';
  }, [isUnlocked, selectedAppsConfigured]);
  const blockedApplications = selectionSummary?.applications ?? [];
  const blockedAppFallbackCount = Math.max(
    0,
    (selectionSummary?.applicationCount ?? (selectedAppsConfigured ? 1 : 0)) - blockedApplications.length,
  );

  return (
    <Screen>
      <Header
        title="Bootyblock"
        subtitle="Squat first. Scroll after."
        logo
        settings={() => router.push('/(tabs)/settings')}
        rightAccessory={
          <View
            className="h-11 flex-row items-center gap-1 rounded-full bg-white/70 px-3"
            accessible
            accessibilityLabel={`${currentStreak} day streak`}
          >
            <Flame
              size={18}
              stroke={colors.raspberry}
              fill={currentStreak > 0 ? colors.raspberry : 'transparent'}
            />
            <Text className="text-base font-black text-cocoa">{currentStreak}</Text>
          </View>
        }
      />

      <View className={`overflow-hidden rounded-[36px] p-6 ${isUnlocked ? 'bg-mint' : 'bg-raspberry'}`}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text
              className={`text-sm font-black uppercase tracking-[2px] ${
                isUnlocked ? 'text-mink' : 'text-petal'
              }`}
            >
              Current status
            </Text>
            <Text className={`mt-2 text-5xl font-black ${isUnlocked ? 'text-cocoa' : 'text-white'}`}>
              {status}
            </Text>
          </View>
          <View
            className={`h-16 w-16 items-center justify-center rounded-full ${
              isUnlocked ? 'bg-white/55' : 'bg-white/20'
            }`}
          >
            <Flame size={30} stroke={isUnlocked ? colors.cocoa : colors.white} />
          </View>
        </View>

        {isUnlocked && activeUnlock ? (
          <View className="mt-8 rounded-[28px] bg-white/55 p-4">
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">Time left</Text>
            <Text className="mt-1 text-3xl font-black text-cocoa">
              {remainingLabel(activeUnlock.endsAt, now)}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <SectionPanel title="Blocked set" subtitle={selectedAppsLabel}>
          <View className="flex-row flex-wrap gap-3">
            {blockedApplications.map((application) => (
              <View
                key={application.id}
                className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white"
                accessible
                accessibilityLabel={application.displayName ?? 'Blocked app'}
              >
                {application.iconDataUri ? (
                  <Image
                    source={{ uri: application.iconDataUri }}
                    className="h-full w-full"
                    resizeMode="contain"
                  />
                ) : (
                  <AppWindow size={22} stroke={colors.raspberry} />
                )}
              </View>
            ))}
            {Array.from({ length: blockedAppFallbackCount }).map((_, index) => (
              <View key={`app-${index}`} className="h-12 w-12 items-center justify-center rounded-2xl bg-petal">
                <AppWindow size={22} stroke={colors.raspberry} />
              </View>
            ))}
            {Array.from({ length: selectionSummary?.categoryCount ?? 0 }).map((_, index) => (
              <View key={`category-${index}`} className="h-12 w-12 items-center justify-center rounded-2xl bg-mint">
                <FolderLock size={22} stroke={colors.cocoa} />
              </View>
            ))}
            {Array.from({ length: selectionSummary?.webDomainCount ?? 0 }).map((_, index) => (
              <View key={`website-${index}`} className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Globe2 size={22} stroke={colors.mink} />
              </View>
            ))}
          </View>
        </SectionPanel>
      </View>

      <View className="mt-auto gap-3 pt-6">
        <Button label="Export Statistics" icon={BarChart3} variant="secondary" onPress={() => setStatisticsVisible(true)} />
        <Button label="Earn minutes" icon={Dumbbell} onPress={() => router.push('/(tabs)/plan')} />
        {!selectedAppsConfigured ? (
          <Button label="Choose blocked apps" icon={LockKeyhole} variant="secondary" onPress={() => router.push('/onboarding/apps')} />
        ) : null}
      </View>

      <StatisticsPanel
        visible={statisticsVisible}
        history={unlockHistory}
        now={now}
        onClose={() => setStatisticsVisible(false)}
      />
    </Screen>
  );
}
