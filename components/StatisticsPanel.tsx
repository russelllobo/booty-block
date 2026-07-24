import { X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Text } from './AppText';
import { BrandLockup } from './BrandLockup';
import { Screen } from './Screen';
import type { UnlockHistoryEntry } from '../lib/store/BootyblockProvider';

type StatsView = 'months' | 'years';

type ActivityCell = {
  key: string;
  day: number | null;
  date: Date | null;
  squats: number;
};

type MonthActivity = {
  key: string;
  label: string;
  total: number;
  cells: ActivityCell[];
};

type YearActivity = {
  year: number;
  total: number;
  weeks: ActivityCell[][];
  monthStarts: { label: string; weekIndex: number }[];
};

const BACKGROUND = '#180811';
const TEXT = '#FFF8FC';
const MUTED = '#B78C9F';
const ACTIVE_TEXT = '#FF9FC4';
const CELL_COLORS = ['#2A101F', '#70143F', '#AE1557', '#E51D70', '#FF7EAE'] as const;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const YEAR_WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_PREVIEW_TOTALS = [9_240, 12_802, 13_581, 140, 88, 82];
const YEAR_PREVIEW_TOTALS = [0, 136_393, 81_919, 1_072, 211];

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const mondayIndex = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayIndex);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function activityByDay(history: UnlockHistoryEntry[]) {
  const totals = new Map<string, number>();
  history.forEach((entry) => {
    const key = localDateKey(new Date(entry.completedAt));
    totals.set(key, (totals.get(key) ?? 0) + entry.squats);
  });
  return totals;
}

function sumMonth(totals: Map<string, number>, year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let total = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    total += totals.get(localDateKey(new Date(year, month, day))) ?? 0;
  }
  return total;
}

function buildMonths(totals: Map<string, number>, now: number): MonthActivity[] {
  const today = startOfDay(now);

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWeekday = (monthDate.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, cellIndex): ActivityCell => {
      const day = cellIndex - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) {
        return { key: `${year}-${month}-empty-${cellIndex}`, day: null, date: null, squats: 0 };
      }
      const date = new Date(year, month, day);
      return {
        key: localDateKey(date),
        day,
        date,
        squats: totals.get(localDateKey(date)) ?? 0,
      };
    });

    return {
      key: `${year}-${month}`,
      label: MONTH_NAMES[month],
      total: sumMonth(totals, year, month),
      cells,
    };
  });
}

function buildYears(totals: Map<string, number>, now: number): YearActivity[] {
  const currentYear = new Date(now).getFullYear();

  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear - index;
    const gridStart = startOfWeek(new Date(year, 0, 1));
    const gridEnd = startOfWeek(new Date(year, 11, 31));
    const weekCount = Math.round((gridEnd.getTime() - gridStart.getTime()) / (7 * 86_400_000)) + 1;
    const weeks = Array.from({ length: weekCount }, (_, weekIndex) => (
      Array.from({ length: 7 }, (_, weekday): ActivityCell => {
        const date = addDays(gridStart, weekIndex * 7 + weekday);
        const inYear = date.getFullYear() === year;
        return {
          key: `${localDateKey(date)}-${weekIndex}-${weekday}`,
          day: inYear ? date.getDate() : null,
          date: inYear ? date : null,
          squats: inYear ? totals.get(localDateKey(date)) ?? 0 : 0,
        };
      })
    ));
    const monthStarts = MONTH_SHORT_NAMES.map((label, month) => {
      const monthStart = new Date(year, month, 1);
      const weekIndex = Math.max(0, Math.floor((startOfWeek(monthStart).getTime() - gridStart.getTime()) / (7 * 86_400_000)));
      return { label, weekIndex };
    });

    return {
      year,
      total: Array.from({ length: 12 }, (_, month) => sumMonth(totals, year, month))
        .reduce((sum, monthTotal) => sum + monthTotal, 0),
      weeks,
      monthStarts,
    };
  });
}

function distributeTotal(total: number, days: number[]) {
  const weights = days.map((day, index) => 4 + ((day * 7 + index * 5) % 13));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = total;
  return days.map((day, index) => {
    const value = index === days.length - 1
      ? remaining
      : Math.max(1, Math.round(total * (weights[index] / weightTotal)));
    remaining -= value;
    return { day, value };
  });
}

function previewEntriesForMonth(
  year: number,
  month: number,
  total: number,
  sparse = false,
  latestDay?: number,
) {
  const daysInMonth = Math.min(new Date(year, month + 1, 0).getDate(), latestDay ?? 31);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
    .filter((day) => sparse
      ? ((day + month * 2) % 7 === 2 || (day + month) % 11 === 0)
      : (day + month * 3) % 8 !== 0);

  return distributeTotal(total, days).map(({ day, value }, index): UnlockHistoryEntry => ({
    id: `stats-preview-${year}-${month}-${index}`,
    peaches: Math.max(1, Math.round(value / 10)),
    squats: value,
    completedAt: new Date(year, month, day, 12).getTime(),
  }));
}

function buildWebPreviewHistory(now: number) {
  const today = startOfDay(now);
  const currentYear = today.getFullYear();
  const recentMonths = MONTH_PREVIEW_TOTALS.flatMap((total, index) => {
    const monthDate = new Date(currentYear, today.getMonth() - index, 1);
    return previewEntriesForMonth(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      total,
      index >= 3,
      index === 0 ? today.getDate() : undefined,
    );
  });

  const historicalYears = YEAR_PREVIEW_TOTALS.slice(1).flatMap((total, yearIndex) => {
    const year = currentYear - yearIndex - 1;
    const monthWeights = Array.from({ length: 12 }, (_, month) => 5 + ((month * 11 + yearIndex * 3) % 9));
    const weightTotal = monthWeights.reduce((sum, weight) => sum + weight, 0);
    let remaining = total;

    return monthWeights.flatMap((weight, month) => {
      const monthTotal = month === 11 ? remaining : Math.max(1, Math.round(total * weight / weightTotal));
      remaining -= monthTotal;
      return previewEntriesForMonth(year, month, monthTotal, yearIndex >= 2);
    });
  });

  return [...recentMonths, ...historicalYears];
}

function intensityIndex(squats: number, maxSquats: number) {
  if (squats <= 0 || maxSquats <= 0) return 0;
  const ratio = squats / maxSquats;
  if (ratio <= 0.15) return 1;
  if (ratio <= 0.36) return 2;
  if (ratio <= 0.66) return 3;
  return 4;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function MonthCalendar({
  month,
  cellSize,
  maxSquats,
}: {
  month: MonthActivity;
  cellSize: number;
  maxSquats: number;
}) {
  const gap = 3;
  return (
    <View style={{ width: cellSize * 7 + gap * 6 }}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{month.label}</Text>
        <Text style={styles.monthTotal}>{formatNumber(month.total)} squats</Text>
      </View>
      <View style={[styles.monthWeekdays, { columnGap: gap }]}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={[styles.monthWeekday, { width: cellSize }]}>
            {label}
          </Text>
        ))}
      </View>
      <View style={[styles.monthGrid, { gap }]}>
        {month.cells.map((cell) => (
          <View
            key={cell.key}
            accessible={Boolean(cell.date)}
            accessibilityLabel={cell.date ? `${cell.date.toLocaleDateString()}: ${cell.squats} squats` : undefined}
            style={[
              styles.monthCell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: cell.date
                  ? CELL_COLORS[intensityIndex(cell.squats, maxSquats)]
                  : 'transparent',
              },
            ]}
          >
            {cell.day ? <Text style={styles.monthDay}>{cell.day}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function YearHeatmap({
  activity,
  cellSize,
  cellGap,
  maxSquats,
}: {
  activity: YearActivity;
  cellSize: number;
  cellGap: number;
  maxSquats: number;
}) {
  const gridWidth = activity.weeks.length * cellSize + (activity.weeks.length - 1) * cellGap;
  return (
    <View style={styles.yearSection}>
      <View style={styles.yearHeader}>
        <Text style={styles.yearTitle}>{activity.year}</Text>
        <Text style={styles.yearTotal}>{formatNumber(activity.total)} squats</Text>
      </View>
      <View style={styles.yearCalendar}>
        <View style={styles.yearLabels}>
          <View style={{ height: 12 }} />
          {YEAR_WEEKDAY_LABELS.map((label, index) => (
            <Text key={`${label}-${index}`} style={[styles.yearWeekday, { height: cellSize + cellGap }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={{ width: gridWidth }}>
          <View style={[styles.yearMonthLabels, { width: gridWidth }]}>
            {activity.monthStarts.map(({ label, weekIndex }) => (
              <Text
                key={label}
                style={[
                  styles.yearMonthLabel,
                  { left: weekIndex * (cellSize + cellGap) },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
          <View style={[styles.yearGrid, { columnGap: cellGap }]}>
            {activity.weeks.map((week, weekIndex) => (
              <View key={`${activity.year}-${weekIndex}`} style={{ rowGap: cellGap }}>
                {week.map((cell) => (
                  <View
                    key={cell.key}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: Math.max(1, cellSize * 0.22),
                      backgroundColor: cell.date
                        ? CELL_COLORS[intensityIndex(cell.squats, maxSquats)]
                        : 'transparent',
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ActivityLegend({ compact = false }: { compact?: boolean }) {
  const size = compact ? 9 : 12;
  return (
    <View style={styles.legend}>
      <Text style={styles.legendLabel}>Less</Text>
      {CELL_COLORS.slice(1).map((color) => (
        <View
          key={color}
          style={{ width: size, height: size, borderRadius: size * 0.2, backgroundColor: color }}
        />
      ))}
      <Text style={styles.legendLabel}>More</Text>
    </View>
  );
}

export function StatisticsContent({
  history,
  now,
  onClose,
}: {
  history: UnlockHistoryEntry[];
  bonusXp: number;
  now: number;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [view, setView] = useState<StatsView>('months');
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(8)).current;
  const isWebPreview = Platform.OS === 'web'
    && history.length > 0
    && history.every((entry) => entry.id.startsWith('preview-'));
  const displayHistory = useMemo(
    () => isWebPreview ? buildWebPreviewHistory(now) : history,
    [history, isWebPreview, now],
  );
  const totals = useMemo(() => activityByDay(displayHistory), [displayHistory]);
  const months = useMemo(() => buildMonths(totals, now), [now, totals]);
  const years = useMemo(() => buildYears(totals, now), [now, totals]);

  const horizontalPadding = width < 430 ? 20 : 28;
  const monthGap = width < 430 ? 16 : 24;
  const monthColumnWidth = Math.floor((width - horizontalPadding * 2 - monthGap) / 2);
  const monthCellSize = Math.max(17, Math.min(25, Math.floor((monthColumnWidth - 18) / 7)));
  const yearLabelWidth = 23;
  const yearCellGap = 1.35;
  const maxWeekCount = Math.max(...years.map((year) => year.weeks.length));
  const yearCellSize = Math.max(
    3.7,
    Math.min(6.2, (width - horizontalPadding * 2 - yearLabelWidth - yearCellGap * (maxWeekCount - 1)) / maxWeekCount),
  );
  const monthMax = Math.max(1, ...months.flatMap((month) => month.cells.map((cell) => cell.squats)));
  const yearMax = Math.max(1, ...years.flatMap((year) => year.weeks.flatMap((week) => week.map((cell) => cell.squats))));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

  function selectView(nextView: StatsView) {
    if (nextView === view) return;
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(contentTranslate, {
        toValue: -5,
        duration: 130,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setView(nextView);
      contentTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    });
  }

  return (
    <Screen
      scroll={false}
      flush
      backgroundColor={BACKGROUND}
      backgroundGradient={['#351025', BACKGROUND, '#10050B']}
    >
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close statistics"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <X size={21} stroke={TEXT} strokeWidth={2.2} />
          </Pressable>
          <BrandLockup
            height={31}
            label="BootyBlock"
            textColor={TEXT}
            textTranslateY={4}
          />
          <View style={styles.closeButtonSpacer} />
        </View>

        <View style={[styles.tabs, { marginHorizontal: horizontalPadding }]}>
          {(['months', 'years'] as StatsView[]).map((option) => {
            const active = view === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => selectView(option)}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.activeTab,
                  pressed && !active && styles.tabPressed,
                ]}
              >
                <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>
                  {option === 'months' ? 'Months' : 'Years'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
            },
          ]}
        >
          {view === 'months' ? (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.monthsContent,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              <View style={[styles.monthColumns, { columnGap: monthGap, rowGap: 24 }]}>
                {months.map((month) => (
                  <MonthCalendar
                    key={month.key}
                    month={month}
                    cellSize={monthCellSize}
                    maxSquats={monthMax}
                  />
                ))}
              </View>
              <ActivityLegend />
            </ScrollView>
          ) : (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.yearsContent,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              {years.map((year) => (
                <YearHeatmap
                  key={year.year}
                  activity={year}
                  cellSize={yearCellSize}
                  cellGap={yearCellGap}
                  maxSquats={yearMax}
                />
              ))}
              <ActivityLegend compact />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 13,
    paddingTop: 8,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  closeButtonSpacer: {
    height: 38,
    width: 38,
  },
  tabs: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
    width: 218,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  activeTab: {
    backgroundColor: '#E91E73',
  },
  tabPressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tabLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    color: TEXT,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  monthsContent: {
    paddingBottom: 18,
  },
  monthColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  monthTotal: {
    color: ACTIVE_TEXT,
    fontSize: 10,
    fontWeight: '700',
  },
  monthWeekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthWeekday: {
    color: '#80596B',
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
  },
  monthDay: {
    color: 'rgba(255,248,252,0.68)',
    fontSize: 7,
    fontWeight: '700',
  },
  legend: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    columnGap: 4,
    flexDirection: 'row',
    marginTop: 18,
  },
  legendLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  yearsContent: {
    paddingBottom: 18,
  },
  yearSection: {
    marginBottom: 21,
  },
  yearHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  yearTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  yearTotal: {
    color: ACTIVE_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  yearCalendar: {
    flexDirection: 'row',
  },
  yearLabels: {
    width: 23,
  },
  yearWeekday: {
    color: '#80596B',
    fontSize: 6,
    fontWeight: '700',
    lineHeight: 7,
  },
  yearMonthLabels: {
    height: 12,
    position: 'relative',
  },
  yearMonthLabel: {
    color: '#80596B',
    fontSize: 5.5,
    fontWeight: '700',
    position: 'absolute',
    top: 0,
  },
  yearGrid: {
    flexDirection: 'row',
  },
});

export function StatisticsPanel({
  visible,
  history,
  bonusXp,
  now,
  onClose,
}: {
  visible: boolean;
  history: UnlockHistoryEntry[];
  bonusXp: number;
  now: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatisticsContent history={history} bonusXp={bonusXp} now={now} onClose={onClose} />
    </Modal>
  );
}
