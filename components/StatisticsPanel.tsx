import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from './AppText';

import { colors } from '../constants/theme';
import type { UnlockHistoryEntry } from '../lib/store/BootyblockProvider';

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
const chartTrackHeight = 190;
const minBarHeight = 10;

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

export function StatisticsContent({
  history,
  now,
  onClose,
}: {
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
    <View className="flex-1 bg-blush px-6 pb-6 pt-16">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-sm font-black uppercase tracking-[2px] text-mink">Statistics</Text>
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
        <View className="flex-row items-end justify-between" style={{ height: chartTrackHeight + 28 }}>
          {buckets.map((bucket) => {
            const barHeight = bucket.squats > 0
              ? Math.max(minBarHeight, (bucket.squats / maxSquats) * chartTrackHeight)
              : 0;
            return (
              <View key={bucket.key} className="flex-1 items-center justify-end px-1">
                <Text className="mb-2 text-xs font-black text-cocoa">{bucket.squats}</Text>
                <View
                  className="w-full justify-end overflow-hidden rounded-full"
                  style={{ height: chartTrackHeight, backgroundColor: colors.petal }}
                >
                  <View
                    className="w-full rounded-full"
                    style={{ height: barHeight, backgroundColor: colors.raspberry }}
                  />
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
  );
}

export function StatisticsPanel({
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
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatisticsContent history={history} now={now} onClose={onClose} />
    </Modal>
  );
}
