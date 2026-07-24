import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight, Brain, Dumbbell, Heart, Quote, Sparkles, Star, TimerReset, Trophy, } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const background = '#07070A';
const gradient = ['#3A0F26', '#07070A'] as const;
const cyan = '#8CF6FF';
const gold = '#FFD76A';
const bootyblockLogo = require('../../assets/logo-small.png');
const resultBeforeImage = require('../../assets/plan/result-before.jpeg');
const resultAfterImage = require('../../assets/plan/result-after.jpeg');

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

function TimelineCard({
  day,
  title,
  body,
  icon: Icon,
  highlighted = false,
  connector = false,
  position = 'left',
}: PlanItem & {
  day: string;
  highlighted?: boolean;
  connector?: boolean;
  position?: 'left' | 'center' | 'right';
}) {
  const accent = highlighted ? cyan : colors.bubble;
  const cardPositionStyle = {
    center: styles.timelineCardCenter,
    left: styles.timelineCardLeft,
    right: styles.timelineCardRight,
  }[position];

  return (
    <View className="flex-row gap-3">
      <View className="w-3 items-center">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
        {connector ? <View className="mt-1 w-0.5 flex-1 bg-white/18" /> : null}
      </View>
      <View
        className={[
          'mb-4 min-h-[118px] rounded-[20px] border px-4 py-4',
          highlighted ? 'border-cyan-300/70 bg-black/35' : 'border-white/14 bg-white/10',
        ].join(' ')}
        style={cardPositionStyle}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: highlighted ? 'rgba(140, 246, 255, 0.22)' : 'rgba(255, 143, 190, 0.22)',
            }}
          >
            <Icon size={21} stroke={accent} strokeWidth={2.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[12px] font-black uppercase text-white">{day}</Text>
            <Text className="mt-0.5 text-[17px] font-black leading-6 text-white">{title}</Text>
          </View>
        </View>
        <Text className="mt-3 text-[14px] font-bold leading-5 text-white">{body}</Text>
      </View>
    </View>
  );
}

function ResultsPreview() {
  return (
    <View className="mt-5 overflow-hidden rounded-[28px] border border-white/12 bg-white/10 p-3" style={styles.resultsCard}>
      <View style={styles.resultsCanvas}>
        <View style={[styles.resultPhoto, styles.resultPhotoBack]}>
          <Image source={resultBeforeImage} resizeMode="cover" style={styles.resultImage} />
        </View>
        <View style={[styles.resultPhoto, styles.resultPhotoFront]}>
          <Image source={resultAfterImage} resizeMode="cover" style={styles.resultImage} />
        </View>
        <View style={styles.resultArrow}>
          <ArrowRight size={20} stroke={background} strokeWidth={3} />
        </View>
        <View style={styles.resultBadge}>
          <Text className="text-[11px] font-black uppercase text-white">First-week results</Text>
        </View>
      </View>
    </View>
  );
}

function TimeBars({ values, accent, maxValue }: { values: number[]; accent: string; maxValue: number }) {
  const max = Math.max(maxValue, 1);

  return (
    <View style={styles.timeChart}>
      {[0, 1, 2].map((line) => (
        <View
          key={line}
          style={[
            styles.timeGridLine,
            {
              bottom: `${line * 33}%`,
            },
          ]}
        />
      ))}
      <View className="flex-row items-end justify-between" style={styles.timeBars}>
        {values.map((value, index) => (
          <View key={`${value}-${index}`} style={styles.timeBarTrack}>
            <View
              style={[
                styles.timeBar,
                {
                  backgroundColor: accent,
                  height: `${Math.max(18, (value / max) * 100)}%`,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function TimeComparisonCard({
  label,
  value,
  accent,
  values,
  maxValue,
}: {
  label: string;
  value: string;
  accent: string;
  values: number[];
  maxValue: number;
}) {
  return (
    <View className="flex-1 px-3 py-4">
      <View className="items-center">
        <View className="flex-row items-center justify-center gap-1.5">
          <Text className="text-center text-[11px] font-black uppercase tracking-wide text-white/45">
            {label}
          </Text>
          <Image source={bootyblockLogo} resizeMode="contain" style={styles.timeLogo} />
          <Text className="text-[12px] font-black text-white">Bootyblock</Text>
        </View>
      </View>
      <Text className="mt-4 text-[12px] font-semibold text-white/55">Daily average</Text>
      <Text className="mt-1 text-[25px] font-black leading-[30px]" style={{ color: accent }}>
        {value}
      </Text>
      <TimeBars values={values} accent={accent} maxValue={maxValue} />
    </View>
  );
}

function TimeDifferencePreview({
  beforeHours,
  afterHours,
  squatsThisWeek,
}: {
  beforeHours: number;
  afterHours: number;
  squatsThisWeek: number;
}) {
  const beforeValues = [beforeHours * 0.78, beforeHours, beforeHours * 0.88, beforeHours * 0.94];
  const afterValues = [afterHours * 0.22, afterHours * 0.26, afterHours * 0.24, afterHours * 0.21];
  const sharedMax = Math.max(...beforeValues, beforeHours, afterHours, 1);

  return (
    <View className="mt-7 rounded-[28px] border border-white/12 bg-white/10 p-3">
      <View className="flex-row items-stretch">
        <TimeComparisonCard
          label="Before"
          value={formatHours(beforeHours)}
          accent={colors.bubble}
          values={beforeValues}
          maxValue={sharedMax}
        />
        <View style={styles.timeComparisonDivider} />
        <TimeComparisonCard
          label="After"
          value={formatHours(afterHours)}
          accent={cyan}
          values={afterValues}
          maxValue={sharedMax}
        />
      </View>
      <View style={styles.timeRepsSummary}>
        <View className="flex-row items-center gap-2">
          <View style={styles.timeRepsIcon}>
            <Dumbbell size={14} stroke={colors.bubble} strokeWidth={2.8} />
          </View>
          <Text className="text-[13px] font-black text-white">Booty-building reps</Text>
        </View>
        <Text className="text-[14px] font-black" style={{ color: colors.bubble }}>
          {squatsThisWeek}+ squats
        </Text>
      </View>
    </View>
  );
}

export default function WellbeingPlan() {
  const posthog = usePostHog();
  const {
    completeOnboarding,
    dailyScreenTimeHours,
    dailyScreenTimeGoalHours,
    requestOnboardingSubscriptionAccess,
  } = useBootyblock();
  const [starting, setStarting] = useState(false);
  const goalHours = dailyScreenTimeGoalHours;
  const savedPerDay = Math.max(0.5, dailyScreenTimeHours - goalHours);
  const squatsThisWeek = Math.round(savedPerDay * 7 * 12);
  const projectionDate = targetDate();

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/wellbeing-plan',
    ONBOARDING_STEPS.firstWeekWellbeingPlan.key,
    ONBOARDING_STEPS.firstWeekWellbeingPlan.title,
    ONBOARDING_STEPS.firstWeekWellbeingPlan.index,
    ONBOARDING_STEP_TOTAL,
  );

  async function startBuilding() {
    if (starting) return;

    setStarting(true);
    try {
      const subscriptionStatus = await requestOnboardingSubscriptionAccess();
      if (subscriptionStatus === 'unavailable') return;

      await completeOnboarding();
      router.replace({ pathname: '/(tabs)', params: { onboardingArrival: '1' } });
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll={false} backgroundColor={background} backgroundGradient={gradient}>
      <StatusBar style="light" animated />
      <OnboardingProgress
        step={ONBOARDING_STEPS.firstWeekWellbeingPlan.index}
        onBack={() => router.back()}
        showBar={false}
        dark
      />

      <SlidePanel animateOnMount>
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <FadeInStage delay={0}>
              <View className="items-center">
                <View className="flex-row items-center justify-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} size={18} stroke={gold} fill={gold} strokeWidth={2.4} />
                  ))}
                </View>

                <Text className="mt-5 text-center text-[31px] font-black leading-[36px] text-white">
                  Your booty building journey starts now!
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={160}>
              <ResultsPreview />
            </FadeInStage>

            <FadeInStage delay={240}>
              <View className="mt-5 flex-row items-center justify-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-300/10 px-5 py-3">
                <Sparkles size={15} stroke={cyan} strokeWidth={2.8} />
                <Text className="text-center text-[15px] font-black text-white">
                  You will feel differences by {projectionDate}
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={300}>
              <TimeDifferencePreview
                beforeHours={dailyScreenTimeHours}
                afterHours={goalHours}
                squatsThisWeek={squatsThisWeek}
              />
            </FadeInStage>

            <FadeInStage delay={380}>
              <View style={styles.sectionDivider} />
            </FadeInStage>

            <FadeInStage delay={440}>
              <View className="mt-7">
                <View className="items-center py-4">
                  <View className="flex-row items-center gap-2">
                    <TimerReset size={20} stroke="rgba(255, 255, 255, 0.94)" strokeWidth={2.6} />
                    <Text className="text-[20px] font-black text-white">7-Day Journey</Text>
                  </View>
                </View>
                <View className="mt-4">
                  <TimelineCard
                    day="Day 1"
                    title="Pause added"
                    body="When the urge hits, Bootyblock makes you move before the feed opens."
                    icon={TimerReset}
                    position="left"
                    connector
                  />
                  <TimelineCard
                    day="Day 2"
                    title="Booty reps begin"
                    body="Short squat sets add a satisfying little win where automatic scrolling used to be."
                    icon={Dumbbell}
                    position="right"
                    connector
                  />
                  <TimelineCard
                    day="Mid-week"
                    title="Mood and focus lift"
                    body="Less feed fog, more agency. You choose when to scroll, and your body gets the credit."
                    icon={Brain}
                    highlighted
                    position="center"
                    connector
                  />
                  <TimelineCard
                    day="Day 5"
                    title="Booty size increases"
                    body="Consistent squat sets start waking up your glutes, helping your booty feel fuller and stronger."
                    icon={Heart}
                    position="left"
                    connector
                  />
                  <TimelineCard
                    day="Day 7"
                    title="Stronger control"
                    body="Your routine starts feeling less like restriction and more like a confident reset."
                    icon={Trophy}
                    position="right"
                  />
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={680}>
              <View style={styles.sectionDivider} />
            </FadeInStage>

            <FadeInStage delay={720}>
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
              label="Start building my booty"
              icon={Dumbbell}
              loading={starting}
              disabled={starting}
              onPress={() => void startBuilding()}
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
  resultsCard: {
    shadowColor: colors.bubble,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  resultsCanvas: {
    height: 294,
    position: 'relative',
  },
  resultBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 3,
  },
  resultArrow: {
    alignItems: 'center',
    backgroundColor: cyan,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    borderWidth: 3,
    height: 42,
    justifyContent: 'center',
    left: 142,
    position: 'absolute',
    top: 126,
    width: 42,
    zIndex: 4,
  },
  resultPhoto: {
    backgroundColor: background,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 3,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'absolute',
  },
  resultPhotoBack: {
    height: 218,
    left: 6,
    top: 0,
    width: 156,
    zIndex: 1,
  },
  resultPhotoFront: {
    bottom: 0,
    height: 252,
    right: 6,
    width: 180,
    zIndex: 2,
  },
  resultImage: {
    height: '100%',
    width: '100%',
  },
  sectionDivider: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    height: 1,
    marginTop: 24,
    width: '74%',
  },
  timeChart: {
    height: 82,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  timeGridLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  timeBars: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  timeBarTrack: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 16,
  },
  timeBar: {
    borderRadius: 4,
    width: 9,
  },
  timeComparisonDivider: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 10,
    width: 1,
  },
  timeRepsIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 122, 184, 0.14)',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  timeRepsSummary: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  timeLogo: {
    height: 16,
    width: 16,
  },
  timelineCardCenter: {
    marginLeft: 8,
    width: '92%',
  },
  timelineCardLeft: {
    marginLeft: 0,
    width: '86%',
  },
  timelineCardRight: {
    marginLeft: 36,
    width: '86%',
  },
});
