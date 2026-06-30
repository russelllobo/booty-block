import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  BatteryCharging,
  Brain,
  Check,
  Dumbbell,
  Heart,
  Hourglass,
  LockKeyhole,
  Moon,
  Quote,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const background = '#07070A';
const gradient = ['#3A0F26', '#07070A'] as const;
const cyan = '#8CF6FF';
const gold = '#FFD76A';

type Icon = ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;

type PlanItem = {
  icon: Icon;
  title: string;
  body: string;
};

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function targetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function exerciseLabel(value: string) {
  switch (value) {
    case 'never':
      return 'start with tiny, doable movement';
    case 'weekly-light':
      return 'turn light weekly movement into a streak';
    case 'weekly-active':
      return 'keep your active rhythm and make it visible';
    case 'daily':
      return 'protect your daily movement streak';
    default:
      return 'build a movement streak that feels doable';
  }
}

function FadeInStage({ children, delay }: { children: ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 560,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function GoalPill({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2">
      <Check size={14} stroke={colors.bubble} strokeWidth={3} />
      <Text className="text-[12px] font-black leading-4 text-white">{label}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: Icon;
}) {
  return (
    <View className="flex-1 rounded-[22px] border border-white/12 bg-white/10 px-4 py-4">
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}22` }}
        >
          <Icon size={16} stroke={accent} strokeWidth={2.6} />
        </View>
        <Text className="text-[11px] font-black uppercase tracking-wide text-white">{label}</Text>
      </View>
      <Text className="mt-3 text-[26px] font-black leading-[30px]" style={{ color: accent }}>
        {value}
      </Text>
    </View>
  );
}

function AnimatedBar({ target, color, delay }: { target: number; color: string; delay: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    width.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(width, {
        toValue: target,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [width, target, delay]);

  return (
    <View className="mt-2 h-3 overflow-hidden rounded-full bg-white/12">
      <Animated.View
        className="h-full rounded-full"
        style={{
          width: width.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function TimelineCard({
  day,
  title,
  body,
  icon: Icon,
  highlighted = false,
  connector = false,
}: PlanItem & { day: string; highlighted?: boolean; connector?: boolean }) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: highlighted ? 'rgba(140, 246, 255, 0.2)' : 'rgba(255, 143, 190, 0.18)',
          }}
        >
          <Icon size={21} stroke={highlighted ? cyan : colors.bubble} strokeWidth={2.6} />
        </View>
        {connector ? <View className="mt-1 w-0.5 flex-1 bg-white/14" /> : null}
      </View>
      <View
        className={[
          'mb-3 flex-1 rounded-[22px] border px-4 py-4',
          highlighted ? 'border-cyan-300/60 bg-cyan-300/8' : 'border-white/12 bg-white/10',
        ].join(' ')}
      >
        <Text className="text-xs font-black uppercase text-white">{day}</Text>
        <Text className="mt-1 text-[16px] font-black leading-5 text-white">{title}</Text>
        <Text className="mt-2 text-sm font-bold leading-5 text-white">{body}</Text>
      </View>
    </View>
  );
}

function FeatureTile({
  label,
  icon: Icon,
}: {
  label: string;
  icon: Icon;
}) {
  return (
    <View className="min-h-[54px] flex-1 flex-row items-center gap-2 rounded-[16px] border border-white/12 bg-white/10 px-3 py-3">
      <Icon size={17} stroke={colors.bubble} strokeWidth={2.5} />
      <Text className="flex-1 text-[12px] font-black leading-4 text-white">{label}</Text>
    </View>
  );
}

export default function WellbeingPlan() {
  const posthog = usePostHog();
  const {
    profileName,
    onboardingGoals,
    exerciseFrequency,
    dailyScreenTimeHours,
    dailyScreenTimeGoalHours,
  } = useBootyblock();
  const name = profileName || 'babe';
  const goalHours = Math.min(dailyScreenTimeHours, dailyScreenTimeGoalHours);
  const savedPerDay = Math.max(0.5, dailyScreenTimeHours - goalHours);
  const savedThisWeek = savedPerDay * 7;
  const squatsThisWeek = Math.round(savedThisWeek * 12);
  const goalLabels = onboardingGoals.length
    ? onboardingGoals
    : ['Reduce screen time', 'Move more every day', 'Boost energy & mood'];
  const visibleGoals = goalLabels.slice(0, 3);
  const movementSummary = exerciseLabel(exerciseFrequency);
  const projectionDate = targetDate();

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/wellbeing-plan',
    'first_week_wellbeing_plan',
    'Your first-week wellbeing plan',
    31,
    32,
  );

  return (
    <Screen scroll={false} backgroundColor={background} backgroundGradient={gradient}>
      <StatusBar style="light" animated />
      <OnboardingProgress step={27} onBack={() => router.back()} showBar={false} dark />

      <SlidePanel>
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <FadeInStage delay={0}>
              <View className="items-center">
                <View className="flex-row items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  <Sparkles size={15} stroke={gold} strokeWidth={2.6} />
                  <Text className="text-xs font-black uppercase text-white">
                    Your first week starts now
                  </Text>
                </View>

                <Text className="mt-5 text-center text-[31px] font-black leading-[36px] text-white">
                  {name}, your booty and wellbeing plan is ready
                </Text>
                <Text className="mt-3 text-center text-base font-bold leading-6 text-white">
                  By this time next week, Bootyblock is built to trade urge-scrolling for movement,
                  clearer focus, and a stronger peach.
                </Text>

                <View className="mt-5 flex-row items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-300/10 px-5 py-3">
                  <Target size={15} stroke={cyan} strokeWidth={2.8} />
                  <Text className="text-center text-[15px] font-black text-white">{projectionDate}</Text>
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={160}>
              <View className="mt-7 flex-row items-center gap-2">
                <StatCard
                  label="Now"
                  value={formatHours(dailyScreenTimeHours)}
                  accent={colors.bubble}
                  icon={Hourglass}
                />
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8">
                  <ArrowRight size={17} stroke={cyan} strokeWidth={2.8} />
                </View>
                <StatCard
                  label="Goal"
                  value={formatHours(goalHours)}
                  accent={cyan}
                  icon={Target}
                />
              </View>
            </FadeInStage>

            <FadeInStage delay={300}>
              <View className="mt-4 rounded-[24px] border border-white/12 bg-white/10 px-4 py-4">
                <Text className="text-[13px] font-black uppercase tracking-wide text-white">
                  Projected first-week shift
                </Text>
                <View className="mt-4 gap-3">
                  <View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-black text-white">Screen-time relief</Text>
                      <Text className="text-sm font-black" style={{ color: cyan }}>
                        {formatHours(savedThisWeek)} back
                      </Text>
                    </View>
                    <AnimatedBar target={72} color={cyan} delay={520} />
                  </View>

                  <View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-black text-white">Booty-building reps</Text>
                      <Text className="text-sm font-black" style={{ color: colors.bubble }}>
                        {squatsThisWeek}+ squats
                      </Text>
                    </View>
                    <AnimatedBar target={84} color={colors.bubble} delay={720} />
                  </View>
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={440}>
              <View className="mt-7">
                <Text className="text-[18px] font-black text-white">Based on your answers</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {visibleGoals.map((goal) => (
                    <GoalPill key={goal} label={goal} />
                  ))}
                </View>
                <Text className="mt-3 text-sm font-bold leading-5 text-white">
                  We will help you {movementSummary}, while lowering daily scrolling from{' '}
                  {formatHours(dailyScreenTimeHours)} toward {formatHours(goalHours)}.
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={580}>
              <View className="mt-7">
                <Text className="text-[18px] font-black text-white">Your first week</Text>
                <View className="mt-4">
                  <TimelineCard
                    day="Day 1"
                    title="Pause added"
                    body="When the urge hits, Bootyblock makes you move before the feed opens."
                    icon={TimerReset}
                    connector
                  />
                  <TimelineCard
                    day="Day 2"
                    title="Booty reps begin"
                    body="Short squat sets add a satisfying little win where automatic scrolling used to be."
                    icon={Dumbbell}
                    connector
                  />
                  <TimelineCard
                    day="Mid-week"
                    title="Mood and focus lift"
                    body="Less feed fog, more agency. You choose when to scroll, and your body gets the credit."
                    icon={Brain}
                    highlighted
                    connector
                  />
                  <TimelineCard
                    day="Day 7"
                    title="Stronger control"
                    body="Your routine starts feeling less like restriction and more like a confident reset."
                    icon={Trophy}
                  />
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={720}>
              <View className="mt-7 rounded-[24px] border border-white/12 bg-white/10 px-4 py-4">
                <View className="flex-row items-center gap-2">
                  <LockKeyhole size={18} stroke={colors.bubble} strokeWidth={2.6} />
                  <Text className="text-[18px] font-black text-white">What unlocks next</Text>
                </View>
                <View className="mt-4 flex-row gap-3">
                  <FeatureTile label="Exercise-based unlocking" icon={Dumbbell} />
                  <FeatureTile label="Screen-time budget" icon={TimerReset} />
                </View>
                <View className="mt-3 flex-row gap-3">
                  <FeatureTile label="Energy and mood tracking" icon={BatteryCharging} />
                  <FeatureTile label="Progress streaks" icon={Zap} />
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={860}>
              <View className="mt-7 rounded-[24px] border border-white/12 bg-white/10 px-5 py-5">
                <Text className="text-center text-[18px] font-black leading-6 text-white">
                  Join the girls choosing a better body-scroll balance
                </Text>
                <View className="mt-4 rounded-[20px] border border-white/10 bg-black/25 px-4 py-4">
                  <Quote size={22} stroke={colors.bubble} strokeWidth={2.4} />
                  <Text className="mt-2 text-sm font-bold leading-5 text-white">
                    A week in, I was scrolling less at night and actually felt proud of the movement
                    I did.
                  </Text>
                  <View className="mt-3 flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-petal">
                      <Heart size={15} stroke={colors.raspberry} fill={colors.petal} strokeWidth={2.5} />
                    </View>
                    <Text className="text-[13px] font-black text-white">Georgia R.</Text>
                    <View className="h-1 w-1 rounded-full bg-white/40" />
                    <Text className="text-[13px] font-bold text-white">Bootyblock member</Text>
                  </View>
                </View>
              </View>
            </FadeInStage>

            <View className="h-5" />
          </ScrollView>

          <View className="border-t border-white/10 bg-black/20 pt-3">
            <Button
              label="Show me around"
              icon={Moon}
              onPress={() => router.replace({ pathname: '/(tabs)', params: { tour: 'onboarding' } })}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
    paddingTop: 8,
  },
});
