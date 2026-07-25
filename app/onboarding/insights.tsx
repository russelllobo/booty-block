import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppWindow,
  BadgeAlert,
  BatteryLow,
  Bot,
  Brain,
  Check,
  CircleOff,
  CircleUserRound,
  Clock3,
  CloudRain,
  Frown,
  Gamepad2,
  Infinity,
  MessageCircle,
  OctagonAlert,
  Play,
  RotateCcw,
  ShieldCheck,
  Smile,
  SmilePlus,
  ShoppingBag,
  Sparkles,
  Star,
  ThumbsUp,
  TimerReset,
  Tv,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/AppText';

import { BrandLockup } from '../../components/BrandLockup';
import { Button, ButtonGlassRevealDelay } from '../../components/Button';
import {
  AnimatedOnboardingOption,
  AnimatedOnboardingOptionIcon,
} from '../../components/AnimatedOnboardingOption';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import {
  HIDDEN_ONBOARDING_STEPS,
  ONBOARDING_STEP_TOTAL,
  ONBOARDING_STEPS,
} from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type Choice = {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
  appIcon?: ImageSourcePropType;
};

const US_AVERAGE_PHONE_HOURS = 4.5;
const RESULT_PERCENT_HIGHER_THAN_AVERAGE = 63;
const TARGET_AGE = 80;
const currentStateBackground = '#07070A';
const currentStateGradient = ['#3A0F26', '#07070A'] as const;
const currentStateRed = '#FF3B4D';
const resultOrange = '#FF6B2A';
const bootyLockGreen = '#5FF2A0';
const exercisePink = colors.bubble;
const starGold = '#FFD76A';
const routineBackground = '#070915';
const routineGradient = ['#4A1232', '#1B0B16', '#050509'] as const;
const routineGlass = 'rgba(255, 255, 255, 0.12)';
const routineGlassBorder = 'rgba(255, 255, 255, 0.28)';
const DEFAULT_ROUTINE_REMINDER = { hour: 12, minute: 55 };
const AnimatedText = Animated.createAnimatedComponent(Text);
const insightStepMetadata = {
  1: HIDDEN_ONBOARDING_STEPS.timeSinkApps,
  2: HIDDEN_ONBOARDING_STEPS.habitFriction,
  3: HIDDEN_ONBOARDING_STEPS.usageFeelings,
  4: HIDDEN_ONBOARDING_STEPS.currentState,
  6: ONBOARDING_STEPS.calculatingProjection,
  7: ONBOARDING_STEPS.resultComparison,
  8: ONBOARDING_STEPS.projectionWarning,
  9: ONBOARDING_STEPS.reclaimedTime,
  10: ONBOARDING_STEPS.previousMethods,
  11: ONBOARDING_STEPS.methodFeedback,
  12: ONBOARDING_STEPS.replacementScience,
  13: ONBOARDING_STEPS.exerciseLink,
  14: ONBOARDING_STEPS.scrollUnlock,
  15: ONBOARDING_STEPS.routineReminder,
} as const;
const currentStateStageDelay = {
  current: 0,
  bootyLock: 1000,
  research: 1700,
  button: 2400,
};
const resultComparisonStageDelay = {
  headline: 120,
  averageBar: 620,
  resultBar: 1800,
  summary: 2550,
  button: 3000,
};

const reflectiveYearNumberStyles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    height: 176,
    justifyContent: 'center',
    minWidth: 330,
  },
  numberLayer: {
    fontSize: 168,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 176,
    position: 'absolute',
    textAlign: 'center',
    width: 330,
  },
  depth: {
    color: '#050406',
    opacity: 0.32,
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 18,
    transform: [{ translateY: 8 }],
  },
  main: {
    textShadowColor: 'rgba(255, 244, 220, 0.34)',
    textShadowOffset: { width: -1, height: -2 },
    textShadowRadius: 3,
  },
});

const routineReminderStyles = StyleSheet.create({
  nativePickerFrame: {
    backgroundColor: routineGlass,
  },
  nativePicker: {
    height: 196,
    width: '100%',
  },
  surface: {
    minHeight: 168,
    backgroundColor: routineGlass,
    justifyContent: 'center',
  },
});

const appIcons = {
  amazon: require('../../assets/onboarding/app-icons/amazon.png'),
  discord: require('../../assets/onboarding/app-icons/discord.png'),
  facebook: require('../../assets/onboarding/app-icons/facebook.png'),
  instagram: require('../../assets/onboarding/app-icons/instagram.png'),
  netflix: require('../../assets/onboarding/app-icons/netflix.png'),
  reddit: require('../../assets/onboarding/app-icons/reddit.png'),
  roblox: require('../../assets/onboarding/app-icons/roblox.png'),
  snapchat: require('../../assets/onboarding/app-icons/snapchat.png'),
  tiktok: require('../../assets/onboarding/app-icons/tiktok.png'),
  twitch: require('../../assets/onboarding/app-icons/twitch.png'),
  x: require('../../assets/onboarding/app-icons/x.png'),
  youtube: require('../../assets/onboarding/app-icons/youtube.png'),
};

const distractingApps: Choice[] = [
  { label: 'TikTok', icon: Video, appIcon: appIcons.tiktok },
  { label: 'YouTube', icon: Play, appIcon: appIcons.youtube },
  { label: 'Instagram', icon: CircleUserRound, appIcon: appIcons.instagram },
  { label: 'Facebook', icon: Users, appIcon: appIcons.facebook },
  { label: 'Mobile games', icon: Gamepad2, appIcon: appIcons.roblox },
  { label: 'X / Twitter', icon: X, appIcon: appIcons.x },
  { label: 'Reddit', icon: Bot, appIcon: appIcons.reddit },
  { label: 'Discord', icon: MessageCircle, appIcon: appIcons.discord },
  { label: 'Online shopping', icon: ShoppingBag, appIcon: appIcons.amazon },
  { label: 'Twitch', icon: Tv, appIcon: appIcons.twitch },
  { label: 'Netflix or streaming', icon: AppWindow, appIcon: appIcons.netflix },
  { label: 'Snapchat', icon: Zap, appIcon: appIcons.snapchat },
];

const frictionReasons: Choice[] = [
  { label: 'Fear of missing out (FOMO)', icon: Users },
  { label: 'Addictive app design', icon: Infinity },
  { label: "It's automatic, no clear reason", icon: Clock3 },
  { label: 'It fills boring moments', icon: Sparkles },
];

const feelingOptions: Choice[] = [
  { label: 'Irritable', icon: Zap },
  { label: 'Not Present', icon: CircleOff },
  { label: 'Mentally Drained', icon: BatteryLow },
  { label: 'Regretful or Guilty', icon: Frown },
  { label: 'Empty or Hollow', icon: CloudRain },
  { label: 'Powerless', icon: OctagonAlert },
  { label: 'Anxious', icon: Brain },
  { label: 'Insecure', icon: BadgeAlert },
  { label: 'Overstimulated', icon: Sparkles },
];

const triedMethods: Choice[] = [
  { label: 'Nothing yet', icon: RotateCcw },
  { label: 'Screen Time limits', icon: TimerReset },
  { label: 'Deleting addictive apps', icon: X },
  { label: 'Browser-only versions', icon: AppWindow },
  { label: 'Digital detox', icon: Sparkles },
  { label: 'Other app blockers', icon: ShieldCheck },
];

const triedMethodFeedback: Record<string, {
  title: string;
  stars: number;
  summary: string;
}> = {
  'Nothing yet': {
    title: 'Fresh Start',
    stars: 3,
    summary: 'No wasted attempts here. Starting clean means we can build the right kind of friction from day one.',
  },
  'Screen Time limits': {
    title: 'Screen Time Limits',
    stars: 4,
    summary: 'A solid first move, but passcodes and “one more minute” buttons make them too easy to bargain with.',
  },
  'Deleting addictive apps': {
    title: 'Deleting Apps',
    stars: 3,
    summary: 'Respect. Uninstalling takes commitment, but reinstalling is usually just a few taps away.',
  },
  'Browser-only versions': {
    title: 'Browser Versions',
    stars: 3,
    summary: 'Clever downgrade, though feeds still know how to pull you in when the tab is right there.',
  },
  'Digital detox': {
    title: 'Digital Detox',
    stars: 4,
    summary: 'Short breaks can reset your head, but staying off long-term needs a system that survives normal life.',
  },
  'Other app blockers': {
    title: 'App Blockers',
    stars: 3,
    summary: 'Useful guardrails, but most blockers still leave a back door when the urge gets loud.',
  },
};

function ageMidpoint(ageRange: string) {
  switch (ageRange) {
    case '14-24':
      return 19;
    case '25-34':
      return 29.5;
    case '35-44':
      return 39.5;
    case '45-54':
      return 49.5;
    case '55+':
      return 60;
    case 'under-18':
      return 16;
    case '25-29':
      return 27;
    case '30-40':
      return 35;
    case '40-plus':
      return 45;
    case '18-24':
    default:
      return 21;
  }
}

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function daysPerYear(hoursPerDay: number) {
  return Math.round((hoursPerDay * 365) / 24);
}

function yearsUntilTargetAge(hoursPerDay: number, ageRange: string) {
  const remainingYears = Math.max(1, TARGET_AGE - ageMidpoint(ageRange));
  return (hoursPerDay * remainingYears) / 24;
}

function formatYears(value: number) {
  if (value < 1) return `${Math.round(value * 12)} months`;
  if (value < 10) return `${value.toFixed(1)} years`;
  return `${Math.round(value)} years`;
}

function dependenceScore(hoursPerDay: number) {
  return Math.max(8, Math.min(99, Math.round((hoursPerDay / US_AVERAGE_PHONE_HOURS) * 33)));
}

function ChoiceRow({
  choice,
  selected,
  onPress,
}: {
  choice: Choice;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = choice.icon;

  return (
    <AnimatedOnboardingOption
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      selected={selected}
      onPress={onPress}
      className="min-h-[62px] flex-row items-center gap-4 rounded-full border-2 px-3 py-2.5"
    >
      <AnimatedOnboardingOptionIcon
        selected={selected}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        {selected ? (
          <Check size={22} stroke={colors.white} strokeWidth={3} />
        ) : (
          <Icon size={21} stroke={colors.raspberry} strokeWidth={2.4} />
        )}
      </AnimatedOnboardingOptionIcon>
      <Text className="flex-1 text-[15px] font-bold leading-5 text-cocoa">{choice.label}</Text>
    </AnimatedOnboardingOption>
  );
}

function StateChip({
  label,
  icon: Icon,
  tone,
}: {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
  tone: 'current' | 'bootyblock';
}) {
  const isCurrent = tone === 'current';
  const accent = isCurrent ? currentStateRed : bootyLockGreen;

  return (
    <View
      className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
      style={{
        backgroundColor: isCurrent ? 'rgba(255, 59, 77, 0.18)' : 'rgba(95, 242, 160, 0.18)',
      }}
    >
      <Icon size={16} stroke={accent} strokeWidth={2.8} />
      <Text className="text-[13px] font-black text-white">{label}</Text>
    </View>
  );
}

function AppIconBubble({
  choice,
}: {
  choice: Choice;
}) {
  const Icon = choice.icon;
  const appIcon = choice.appIcon;

  return (
    <View className="items-center gap-1.5">
      <View
        className="h-14 w-14 items-center justify-center"
      >
        {appIcon ? (
          <Image
            source={appIcon}
            accessibilityLabel={`${choice.label} icon`}
            resizeMode="contain"
            style={{ height: 48, width: 48, borderRadius: 11 }}
          />
        ) : (
          <Icon size={27} stroke={currentStateRed} strokeWidth={2.5} />
        )}
      </View>
      <Text className="max-w-[76px] text-center text-[10px] font-black text-white" numberOfLines={1}>
        {choice.label}
      </Text>
    </View>
  );
}

function FadeInStage({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <ButtonGlassRevealDelay delayMs={delay + 520}>
        {children}
      </ButtonGlassRevealDelay>
    </Animated.View>
  );
}

function GrowingDivider({ delay }: { delay: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    width.setValue(0);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(width, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, width]);

  return (
    <View className="my-8 h-0.5 w-[82%] items-start overflow-hidden rounded-full">
      <Animated.View
        className="h-full rounded-full bg-white/25"
        style={{
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

function CurrentStateSlide({
  selectedApps,
  selectedFeelings,
  onContinue,
}: {
  selectedApps: string[];
  selectedFeelings: string[];
  onContinue: () => void;
}) {
  const pickedApps = (selectedApps.length ? selectedApps : ['TikTok', 'Instagram'])
    .map((label) => distractingApps.find((choice) => choice.label === label))
    .filter(Boolean)
    .slice(0, 3) as Choice[];
  const pickedFeelings = (selectedFeelings.length ? selectedFeelings : ['Mentally Drained', 'Powerless'])
    .map((label) => feelingOptions.find((choice) => choice.label === label))
    .filter(Boolean)
    .slice(0, 3) as Choice[];

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center py-5">
        <FadeInStage delay={currentStateStageDelay.current}>
          <View className="w-full items-center">
            <Text
              className="text-center text-[28px] font-bold leading-[33px]"
              style={{ color: currentStateRed }}
            >
              Current State
            </Text>

            <View className="mt-5 flex-row justify-center gap-4">
              {pickedApps.map((choice) => (
                <AppIconBubble key={choice.label} choice={choice} />
              ))}
            </View>

            <View className="mt-4 flex-row flex-wrap justify-center gap-2">
              {pickedFeelings.map(({ label, icon }) => (
                <StateChip key={label} label={label} icon={icon} tone="current" />
              ))}
            </View>
          </View>
        </FadeInStage>

        <View className="my-8 h-0.5 w-[82%] rounded-full bg-white/25" />

        <FadeInStage delay={currentStateStageDelay.bootyLock}>
          <View className="w-full items-center">
            <View className="flex-row items-center justify-center gap-3">
              <Text
                className="text-center text-[28px] font-bold leading-[33px]"
                style={{ color: bootyLockGreen }}
              >
                With
              </Text>
              <BrandLockup
                height={38}
                label="BootyBlock logo"
                textColor={colors.white}
                textTranslateY={0}
              />
            </View>

            <View className="mt-5 flex-row flex-wrap justify-center gap-2.5">
              <StateChip label="Confident" icon={Smile} tone="bootyblock" />
              <StateChip label="Empowered" icon={ThumbsUp} tone="bootyblock" />
              <StateChip label="In Control" icon={SmilePlus} tone="bootyblock" />
            </View>
          </View>
        </FadeInStage>

        <FadeInStage delay={currentStateStageDelay.research}>
          <View className="mt-7 rounded-[20px] border border-white/20 bg-white/14 px-4 py-3">
            <Text className="text-xs font-black uppercase tracking-[1.5px] text-white">
              The research
            </Text>
            <Text className="mt-2 text-sm font-bold leading-5 text-white">
              Heavy social media use is associated with lower self-esteem among
              adolescents, according to PubMed Central research.
            </Text>
          </View>
        </FadeInStage>
      </View>

      <FadeInStage delay={currentStateStageDelay.button}>
        <View className="pt-3">
          <Button label="Continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function ResultBar({
  value,
  label,
  variant,
  delay = 0,
  translateXFrom = 0,
}: {
  value: number;
  label: string;
  variant: 'result' | 'average';
  delay?: number;
  translateXFrom?: number;
}) {
  const isResult = variant === 'result';
  const scale = isResult ? 3.2 : 2.2;
  const height = Math.max(80, Math.min(240, value * scale));
  const barHeight = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(translateXFrom)).current;

  useEffect(() => {
    barHeight.setValue(0);
    opacity.setValue(0);
    translateX.setValue(translateXFrom);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(barHeight, {
          toValue: height,
          duration: 760,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateX, {
        toValue: 0,
        duration: translateXFrom === 0 ? 1 : 460,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [barHeight, delay, height, opacity, translateX, translateXFrom]);

  return (
    <Animated.View
      className="w-[116px] items-center"
      style={{ opacity, transform: [{ translateX }] }}
    >
      <View className="h-[250px] justify-end">
        <Animated.View
          className="w-[88px] overflow-hidden rounded-[22px]"
          style={{
            height: barHeight,
            shadowColor: isResult ? resultOrange : '#65EFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isResult ? 0.4 : 0.24,
            shadowRadius: 18,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={isResult ? [resultOrange, '#FF7F36', '#FFE6A6'] : ['#68F1FF', '#F5FAFF', '#FFFFFF']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text
            className="mt-3 text-center text-[20px] font-black leading-7"
            style={{ color: isResult ? colors.white : colors.cocoa }}
          >
            {value}%
          </Text>
        </Animated.View>
      </View>
      <Text
        className="mt-4 w-full text-center text-[13px] font-black leading-4"
        style={{ color: colors.white }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

function ResultComparisonSlide({
  currentScore,
  averageScore,
  onContinue,
}: {
  currentScore: number;
  averageScore: number;
  onContinue: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="flex-1 justify-between pb-1 pt-1">
        <FadeInStage delay={resultComparisonStageDelay.headline}>
          <View className="px-10">
            <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
              You're higher than average
            </Text>

            <Text className="mt-8 text-center text-[18px] font-bold leading-7 text-white">
              Your response indicates a clear{'\n'}
              <Text style={{ color: resultOrange }}>negative dependence</Text> on your phone*
            </Text>
          </View>
        </FadeInStage>

        <View className="mt-4 flex-1 items-center justify-center">
          <View
            className="flex-row items-end justify-center gap-10"
            style={{ minHeight: 280 }}
          >
            <ResultBar
              value={averageScore}
              label="Average"
              variant="average"
              delay={resultComparisonStageDelay.averageBar}
              translateXFrom={78}
            />
            <ResultBar
              value={currentScore}
              label="Your Result"
              variant="result"
              delay={resultComparisonStageDelay.resultBar}
            />
          </View>
        </View>

        <View>
          <FadeInStage delay={resultComparisonStageDelay.summary}>
            <Text className="mb-7 px-10 text-center text-[28px] font-bold leading-[33px] text-white">
              <Text style={{ color: resultOrange }}>{RESULT_PERCENT_HIGHER_THAN_AVERAGE}% higher</Text> than the average!
            </Text>
          </FadeInStage>

          <FadeInStage delay={resultComparisonStageDelay.button}>
            <View>
              <Text
                className="mb-3 text-center text-[11px] font-bold leading-4"
                style={{ color: colors.white }}
              >
                *This is not a psychological diagnosis
              </Text>

              <Button label="Continue" onPress={onContinue} />
            </View>
          </FadeInStage>
        </View>
      </View>
    </View>
  );
}

function CalculatingSlide({ onComplete }: { onComplete: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);

    const progressAnimation = Animated.sequence([
      Animated.timing(progress, {
        toValue: 0.18,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(180),
      Animated.timing(progress, {
        toValue: 0.46,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(260),
      Animated.timing(progress, {
        toValue: 0.72,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(220),
      Animated.timing(progress, {
        toValue: 0.88,
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(160),
      Animated.timing(progress, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    const timer = setTimeout(onComplete, 2350);

    progressAnimation.start();

    return () => {
      progressAnimation.stop();
      clearTimeout(timer);
    };
  }, [onComplete, progress]);

  return (
    <View className="flex-1 items-center px-9 pb-1 pt-1" style={{ paddingTop: 104 }}>
      <View className="items-center">
        <FadeInStage delay={0}>
          <View className="items-center">
            <View className="h-[120px] w-[120px] items-center justify-center">
              <Image
                source={require('../../assets/logo.png')}
                accessibilityLabel="Bootyblock logo"
                resizeMode="contain"
                style={{ width: 112, height: 112 }}
              />
            </View>

            <Text
              className="mt-9 text-center text-[30px] font-black leading-[35px]"
              style={{ color: colors.white }}
            >
              Calculating your results...
            </Text>
          </View>
        </FadeInStage>

        <View
          style={{
            width: 260,
            maxWidth: '100%',
            height: 12,
            marginTop: 22,
            borderRadius: 999,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.42)',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 999,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: colors.white,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function useCountUpValue(
  value: number,
  duration = 850,
  delay = 0,
  enabled = true,
  onComplete?: () => void,
) {
  const animatedValue = useRef(new Animated.Value(enabled ? 0 : value)).current;
  const [displayValue, setDisplayValue] = useState(enabled ? 0 : value);

  useEffect(() => {
    if (!enabled) {
      animatedValue.setValue(value);
      setDisplayValue(value);
      onComplete?.();
      return;
    }

    animatedValue.setValue(0);
    setDisplayValue(0);

    const listener = animatedValue.addListener(({ value: nextValue }) => {
      setDisplayValue(Math.round(nextValue));
    });
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(animatedValue, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
    return () => {
      animation.stop();
      animatedValue.removeListener(listener);
    };
  }, [animatedValue, delay, duration, enabled, onComplete, value]);

  return displayValue;
}

function CountUpText({
  value,
  duration = 850,
  delay = 0,
  style,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  style?: object;
  className?: string;
}) {
  const displayValue = useCountUpValue(value, duration, delay);

  return (
    <Text className={className} style={style}>
      {displayValue}
    </Text>
  );
}

function ProjectionWarningSlide({
  currentDays,
  projectedYears,
  dailyHours,
  remainingYears,
  onContinue,
}: {
  currentDays: number;
  projectedYears: number;
  dailyHours: number;
  remainingYears: number;
  onContinue: () => void;
}) {
  const projectedYearLabel = Math.max(1, Math.round(projectedYears));
  const [yearAnimationComplete, setYearAnimationComplete] = useState(false);
  const handleYearAnimationComplete = useCallback(() => {
    setYearAnimationComplete(true);
  }, []);

  useEffect(() => {
    setYearAnimationComplete(false);
  }, [projectedYearLabel]);

  return (
    <View className="flex-1">
      <View className="flex-1 justify-between pb-1 pt-1">
        <View className="px-10">
          <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
            You'll spend{' '}
            <Text style={{ color: resultOrange }}>{currentDays} days</Text> on your phone over the next year
          </Text>

          <Text className="mt-7 text-center text-[16px] font-bold text-white">
            Which means you're on track to spend
          </Text>
        </View>

        <View className="items-center">
          <ReflectiveYearNumber
            value={projectedYearLabel}
            color={resultOrange}
            animated
            delay={500}
            onAnimationComplete={handleYearAnimationComplete}
          />
          <Text className="mt-2 text-center text-[26px] font-black uppercase tracking-[2px] text-white">
            years
          </Text>

          <Text className="mt-7 max-w-[320px] text-center text-[21px] font-bold leading-8 text-white">
            of your life looking down at your phone. Yep, you read this right.
          </Text>
        </View>

        <View className="min-h-[56px]">
          {yearAnimationComplete ? (
            <FadeInStage delay={0}>
              <Button label="Continue" onPress={onContinue} />
            </FadeInStage>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ReflectiveYearNumber({
  value,
  color,
  animated = false,
  delay = 0,
  onAnimationComplete,
}: {
  value: number;
  color: string;
  animated?: boolean;
  delay?: number;
  onAnimationComplete?: () => void;
}) {
  const displayValue = useCountUpValue(value, 950, delay, animated, onAnimationComplete);

  return (
    <View style={reflectiveYearNumberStyles.frame}>
      <Text style={[reflectiveYearNumberStyles.numberLayer, reflectiveYearNumberStyles.depth]}>
        {displayValue}
      </Text>
      <Text
        style={[
          reflectiveYearNumberStyles.numberLayer,
          reflectiveYearNumberStyles.main,
          { color },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function ReclaimedTimeSlide({
  reclaimedYears,
  onContinue,
}: {
  reclaimedYears: number;
  onContinue: () => void;
}) {
  const reclaimedYearLabel = Math.max(1, Math.round(reclaimedYears));
  const [yearAnimationComplete, setYearAnimationComplete] = useState(false);
  const handleYearAnimationComplete = useCallback(() => {
    setYearAnimationComplete(true);
  }, []);

  useEffect(() => {
    setYearAnimationComplete(false);
  }, [reclaimedYearLabel]);

  return (
    <View className="flex-1">
      <View className="flex-1 justify-between pb-1 pt-1">
        <View className="px-10">
          <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
            Bootyblock can help you get back
          </Text>
        </View>

        <View className="items-center">
          <ReflectiveYearNumber
            value={reclaimedYearLabel}
            color={colors.bubble}
            animated
            delay={320}
            onAnimationComplete={handleYearAnimationComplete}
          />
          <Text className="mt-2 text-center text-[26px] font-black uppercase tracking-[2px] text-white">
            years+
          </Text>

          <Text className="mt-7 max-w-[330px] text-center text-[21px] font-bold leading-8 text-white">
            of your life free from distractions, and help you achieve your dreams.
          </Text>
        </View>

        <View>
          <Text
            className="mb-3 text-center text-[11px] font-bold leading-4"
            style={{ color: colors.white }}
          >
            According to your profile combined with Bootyblock's program.
          </Text>

          <View className="min-h-[56px]">
            {yearAnimationComplete ? (
              <FadeInStage delay={0}>
                <Button label="Continue" onPress={onContinue} />
              </FadeInStage>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function MethodFeedbackSlide({
  selectedTried,
  onContinue,
}: {
  selectedTried: string[];
  onContinue: () => void;
}) {
  const primaryTried = selectedTried[0] ?? 'Nothing yet';
  const feedback = triedMethodFeedback[primaryTried] ?? triedMethodFeedback['Nothing yet'];
  const triedChoice = triedMethods.find((choice) => choice.label === primaryTried) ?? triedMethods[0];
  const Icon = triedChoice.icon;
  const hasTriedMethod = primaryTried !== 'Nothing yet';

  return (
    <View className="flex-1">
      <View className="flex-1 justify-center py-5">
        <FadeInStage delay={currentStateStageDelay.current}>
          <View className="w-full items-center px-10">
            <Text
              className="text-center text-[28px] font-bold leading-[33px]"
              style={{ color: currentStateRed }}
            >
              {hasTriedMethod
                ? 'Big respect for tackling something tough.'
                : 'You are starting with a clean slate.'}
            </Text>
            <Text
              className="mt-3 text-center text-base font-bold leading-5"
              style={{ color: colors.white }}
            >
              We did the research, here's the breakdown:
            </Text>
          </View>
        </FadeInStage>

        <FadeInStage delay={currentStateStageDelay.research}>
          <View className="mt-8 rounded-[22px] border border-white/20 bg-white/14 px-4 py-4">
            <View className="flex-row items-center gap-2.5">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-white/16">
                <Icon size={15} stroke={colors.white} strokeWidth={2.5} />
              </View>
              <Text className="flex-1 text-sm font-black text-white">{feedback.title}</Text>
              <View className="flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Star
                    key={rating}
                    size={15}
                    fill={rating <= feedback.stars ? currentStateRed : 'transparent'}
                    stroke={rating <= feedback.stars ? currentStateRed : 'rgba(255,255,255,0.45)'}
                    strokeWidth={2.2}
                  />
                ))}
              </View>
            </View>

            <Text
              className="mt-3 text-[13px] font-bold leading-5"
              style={{ color: colors.white }}
              numberOfLines={2}
            >
              {feedback.summary}
            </Text>

            <Text
              className="mt-2 text-right text-[11px] font-black"
              style={{ color: colors.white }}
            >
              Read more
            </Text>
          </View>
        </FadeInStage>
      </View>

      <FadeInStage delay={currentStateStageDelay.button}>
        <View className="pt-3">
          <Button label="See how Bootyblock works" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function ReplacementScienceSlide({ onContinue }: { onContinue: () => void }) {
  const stageDelay = {
    headline: 0,
    divider: 560,
    science: 1000,
    replacement: 2050,
    button: 2900,
  };

  return (
    <View className="flex-1">
      <FadeInStage delay={stageDelay.headline}>
        <View className="w-full items-center pt-3">
          <Text
            className="text-center text-[26px] font-black leading-9"
            style={{ color: starGold }}
          >
            ★★★★★
          </Text>
        </View>
      </FadeInStage>

      <View className="flex-1 items-center justify-center py-5">
        <FadeInStage delay={stageDelay.headline}>
          <View className="w-full items-center px-10">
            <Text
              className="text-center text-[28px] font-bold leading-[33px]"
              style={{ color: colors.white }}
            >
              We know that{'\n'}
              <Text style={{ color: currentStateRed }}>Quitting is hard.</Text>
            </Text>
          </View>
        </FadeInStage>

        <GrowingDivider delay={stageDelay.divider} />

        <FadeInStage delay={stageDelay.science}>
          <View className="w-full items-center px-10">
            <Text
              className="text-center text-[28px] font-bold leading-[33px]"
              style={{ color: colors.white }}
            >
              Science agrees - the{'\n'}
              best method is to{'\n'}
              <Text style={{ color: bootyLockGreen }}>Replace.</Text>
            </Text>
          </View>
        </FadeInStage>

        <FadeInStage delay={stageDelay.replacement}>
          <View className="w-full items-center px-10">
            <Text
              className="mt-8 text-center text-[28px] font-bold leading-[33px]"
              style={{ color: colors.white }}
            >
              And what better{'\n'}
              replacement than{'\n'}
              <Text style={{ color: bootyLockGreen }}>Growing your booty 🍑?</Text>
            </Text>
          </View>
        </FadeInStage>
      </View>

      <FadeInStage delay={stageDelay.button}>
        <View>
          <Text
            className="mb-5 text-center text-[10px] font-bold leading-4"
            style={{ color: 'rgba(255,255,255,0.68)' }}
          >
            Backed by <Text style={{ color: bootyLockGreen, textDecorationLine: 'underline' }}>longitudinal studies</Text>,{' '}
            <Text style={{ color: bootyLockGreen, textDecorationLine: 'underline' }}>systematic reviews</Text> and{'\n'}
            <Text style={{ color: bootyLockGreen, textDecorationLine: 'underline' }}>behavioral science experts</Text>.
          </Text>

          <Button label="Continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function PlusOnePop() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(0);
    scale.setValue(0.6);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -46,
        duration: 850,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [opacity, translateY, scale]);

  return (
    <AnimatedText
      style={{
        fontSize: 20,
        fontWeight: '900',
        color: exercisePink,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      +1 min
    </AnimatedText>
  );
}

function SquatAnimation() {
  const squat = useRef(new Animated.Value(0)).current;
  const [minutes, setMinutes] = useState(0);
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(squat, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(squat, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    let cancelled = false;
    function tick() {
      if (cancelled) return;
      setMinutes((m) => m + 1);
      setPopKey((k) => k + 1);
      setTimeout(tick, 1500);
    }
    const firstTick = setTimeout(tick, 750);

    return () => {
      cancelled = true;
      loop.stop();
      clearTimeout(firstTick);
    };
  }, [squat]);

  const hipY = squat.interpolate({ inputRange: [0, 1], outputRange: [0, 38] });
  const torsoRotate = squat.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '22deg'] });
  const upperLegRotate = squat.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-49deg'] });
  const lowerLegRotate = squat.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '98deg'] });
  const armRotate = squat.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-80deg'] });
  const farLegOpacity = 0.5;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '900',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          Screen time credits
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
          <Text
            style={{
              fontSize: 58,
              fontWeight: '900',
              color: exercisePink,
              fontVariant: ['tabular-nums'],
            }}
          >
            {minutes}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.white, marginLeft: 8 }}>
            min
          </Text>
        </View>
      </View>

      <View style={{ width: 220, height: 240 }}>
        {popKey > 0 ? (
          <View key={popKey} style={{ position: 'absolute', top: 70, left: 140, zIndex: 5 }}>
            <PlusOnePop />
          </View>
        ) : null}

        <View
          style={{
            position: 'absolute',
            bottom: 4,
            left: 60,
            width: 100,
            height: 10,
            borderRadius: 5,
            backgroundColor: 'rgba(255, 143, 190, 0.18)',
          }}
        />

        <Animated.View
          style={{
            position: 'absolute',
            bottom: 110,
            left: 110,
            width: 1,
            height: 1,
            transform: [{ translateY: hipY }],
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: -11,
              width: 10,
              height: 55,
              borderRadius: 5,
              backgroundColor: exercisePink,
              opacity: farLegOpacity,
              transform: [{ rotate: upperLegRotate }],
              transformOrigin: 'top center',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 55,
                left: 0,
                width: 10,
                height: 55,
                borderRadius: 5,
                backgroundColor: exercisePink,
                opacity: farLegOpacity,
                transform: [{ rotate: lowerLegRotate }],
                transformOrigin: 'top center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 49,
                  left: -8,
                  width: 26,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: exercisePink,
                  opacity: farLegOpacity,
                }}
              />
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              top: -70,
              left: -14,
              width: 28,
              height: 70,
              borderRadius: 14,
              backgroundColor: exercisePink,
              transform: [{ rotate: torsoRotate }],
              transformOrigin: 'bottom center',
            }}
          >
              <View
                style={{
                  position: 'absolute',
                  top: -38,
                  left: -4,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: exercisePink,
                }}
              />
              <Animated.View
              style={{
                position: 'absolute',
                top: 8,
                left: 20,
                width: 8,
                height: 52,
                borderRadius: 4,
                backgroundColor: exercisePink,
                transform: [{ rotate: armRotate }],
                transformOrigin: 'top center',
              }}
            />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: -5,
              width: 10,
              height: 55,
              borderRadius: 5,
              backgroundColor: exercisePink,
              transform: [{ rotate: upperLegRotate }],
              transformOrigin: 'top center',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 55,
                left: 0,
                width: 10,
                height: 55,
                borderRadius: 5,
                backgroundColor: exercisePink,
                transform: [{ rotate: lowerLegRotate }],
                transformOrigin: 'top center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 49,
                  left: -8,
                  width: 26,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: exercisePink,
                }}
              />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function ExerciseSlide({ onContinue }: { onContinue: () => void }) {
  return (
    <View className="flex-1">
      <FadeInStage delay={currentStateStageDelay.current}>
        <View className="w-full items-center px-8 pt-2">
          <Text
            className="text-center text-[26px] font-bold leading-[32px]"
            style={{ color: colors.white }}
          >
            In <Text style={{ color: exercisePink }}>Bootyblock</Text>, you can{'\n'}
            save up screen time by{'\n'}
            <Text style={{ color: exercisePink }}>squatting</Text> whenever you want.
          </Text>
        </View>
      </FadeInStage>

      <View className="flex-1 items-center justify-center">
        <FadeInStage delay={currentStateStageDelay.bootyLock}>
          <SquatAnimation />
        </FadeInStage>
      </View>

      <FadeInStage delay={currentStateStageDelay.button}>
        <View className="pt-3">
          <Button label="Continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

const feedRowSpecs = [
  { barWidth: 96, tint: 0.18 },
  { barWidth: 72, tint: 0.14 },
  { barWidth: 104, tint: 0.18 },
  { barWidth: 64, tint: 0.14 },
  { barWidth: 88, tint: 0.18 },
  { barWidth: 76, tint: 0.14 },
];

function FeedRow({ barWidth, tint }: { barWidth: number; tint: number }) {
  return (
    <View
      style={{
        height: 54,
        width: '100%',
        borderRadius: 14,
        backgroundColor: `rgba(255, 143, 190, ${tint})`,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(255, 143, 190, 0.42)',
        }}
      />
      <View style={{ flex: 1, gap: 7 }}>
        <View
          style={{
            height: 8,
            width: barWidth,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 214, 231, 0.55)',
          }}
        />
        <View
          style={{
            height: 8,
            width: barWidth * 0.62,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 214, 231, 0.35)',
          }}
        />
      </View>
    </View>
  );
}

function ScrollUnlockIllustration() {
  const swipe = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const thumbOpacity = useRef(new Animated.Value(0)).current;
  const [credits, setCredits] = useState(10);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(swipe, {
            toValue: 1,
            duration: 1300,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.delay(560),
          Animated.timing(swipe, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ]),
        Animated.sequence([
          Animated.timing(thumbOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(thumbOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1060),
        ]),
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(580),
        ]),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [swipe, glow, thumbOpacity]);

  useEffect(() => {
    setCredits(10);

    const countdownInterval = setInterval(() => {
      setCredits((current) => (current > 0 ? current - 1 : 10));
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, []);

  const thumbTranslateY = swipe.interpolate({
    inputRange: [0, 1],
    outputRange: [48, -54],
  });
  const thumbRotate = swipe.interpolate({
    inputRange: [0, 1],
    outputRange: ['12deg', '-6deg'],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.5],
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const feedTranslateY = swipe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -128],
  });
  const screenWake = swipe.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.55, 0.12, 0],
  });

  return (
    <View className="items-center">
      <View style={{ height: 312, width: 286 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 55,
            top: 6,
            width: 176,
            height: 236,
            borderRadius: 52,
            backgroundColor: 'rgba(255, 143, 190, 0.22)',
            opacity: glowOpacity,
            shadowColor: exercisePink,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 38,
            transform: [{ scale: glowScale }],
          }}
        />

        <View
          style={{
            position: 'absolute',
            left: 69,
            top: 14,
            width: 148,
            height: 222,
            borderRadius: 30,
            backgroundColor: '#09070B',
            borderWidth: 3,
            borderColor: exercisePink,
            shadowColor: exercisePink,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 24,
            elevation: 6,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              bottom: 8,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: '#120A10',
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000000',
                opacity: screenWake,
                zIndex: 3,
              }}
            />

            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingTop: 40,
                paddingHorizontal: 10,
                gap: 10,
                transform: [{ translateY: feedTranslateY }],
              }}
            >
              {feedRowSpecs.map((spec, i) => (
                <FeedRow key={i} barWidth={spec.barWidth} tint={spec.tint} />
              ))}
            </Animated.View>

            <LinearGradient
              colors={['#120A10', 'rgba(18, 10, 16, 0)']}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 48,
                zIndex: 4,
              }}
            />

            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                right: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                zIndex: 5,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: exercisePink,
                  backgroundColor: 'rgba(255, 143, 190, 0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: exercisePink }}>S</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 143, 190, 0.18)',
                }}
              />
            </View>

            <LinearGradient
              colors={['rgba(18, 10, 16, 0)', '#120A10']}
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 42,
                zIndex: 4,
              }}
            />
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 8,
              left: 74,
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
            }}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 174,
            top: 112,
            width: 38,
            height: 60,
            opacity: thumbOpacity,
            transform: [{ translateY: thumbTranslateY }, { rotate: thumbRotate }],
            zIndex: 6,
          }}
        >
          <View
            style={{
              width: 38,
              height: 60,
              borderRadius: 19,
              backgroundColor: exercisePink,
              shadowColor: exercisePink,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 4,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 5,
              left: 8,
              width: 22,
              height: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.32)',
            }}
          />
        </Animated.View>
      </View>

      <View
        style={{
          marginTop: -10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255, 214, 231, 0.45)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: exercisePink,
            backgroundColor: 'rgba(255, 143, 190, 0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '900', color: exercisePink }}>S</Text>
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '900',
            color: colors.white,
            fontVariant: ['tabular-nums'],
            minWidth: 64,
          }}
        >
          {credits} min
        </Text>
      </View>
    </View>
  );
}

function ScrollUnlockSlide({ onContinue }: { onContinue: () => void }) {
  const stageDelay = {
    illustration: 0,
    headline: 480,
    subtitle: 1080,
    button: 1850,
  };

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <FadeInStage delay={stageDelay.illustration}>
          <ScrollUnlockIllustration />
        </FadeInStage>
      </View>

      <FadeInStage delay={stageDelay.headline}>
        <View className="items-center px-8">
          <Text
            className="text-center text-[28px] font-bold leading-[33px]"
            style={{ color: exercisePink }}
          >
            Scroll
          </Text>
        </View>
      </FadeInStage>

      <FadeInStage delay={stageDelay.subtitle}>
        <Text
          className="mt-4 w-full px-6 text-center text-base font-semibold leading-6 text-white/70"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          You can use your saved up Screen Time any time.
        </Text>
      </FadeInStage>

      <FadeInStage delay={stageDelay.button}>
        <View className="pt-6">
          <Button label="Continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function dateFromReminderTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function displayHourFromDate(date: Date) {
  const hour = date.getHours();
  const value = hour % 12;
  return value === 0 ? 12 : value;
}

function formatMinute(date: Date) {
  return String(date.getMinutes()).padStart(2, '0');
}

function periodFromDate(date: Date) {
  return date.getHours() >= 12 ? 'PM' : 'AM';
}

function formatReminderDate(date: Date) {
  return `${displayHourFromDate(date)}:${formatMinute(date)} ${periodFromDate(date)}`;
}

function RoutineTimeSurface({
  selectedDate,
  onPress,
}: {
  selectedDate: Date;
  onPress?: () => void;
}) {
  const content = (
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.20)', 'rgba(255, 255, 255, 0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="overflow-hidden rounded-[28px] border px-7"
      style={[routineReminderStyles.surface, { borderColor: routineGlassBorder }]}
    >
      <Text className="text-sm font-black uppercase tracking-[2px] text-white/45">
        Routine time
      </Text>
      <View className="mt-3 flex-row items-end justify-center">
        <Text className="text-[58px] font-black leading-[64px] text-white">
          {displayHourFromDate(selectedDate)}:{formatMinute(selectedDate)}
        </Text>
        <Text className="mb-2 ml-3 text-xl font-black text-white/60">
          {periodFromDate(selectedDate)}
        </Text>
      </View>
    </LinearGradient>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose routine time, currently ${formatReminderDate(selectedDate)}`}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

function RoutineReminderSlide({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { routineReminderTime, setRoutineReminderTime } = useBootyblock();
  const initialTime = routineReminderTime ?? DEFAULT_ROUTINE_REMINDER;
  const [selectedDate, setSelectedDate] = useState(() =>
    dateFromReminderTime(initialTime.hour, initialTime.minute),
  );

  function setNativeDate(date: Date) {
    setSelectedDate(dateFromReminderTime(date.getHours(), date.getMinutes()));
    void Haptics.selectionAsync();
  }

  function handlePickerChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed' || !date) return;
    setNativeDate(date);
  }

  function skip() {
    setRoutineReminderTime(null);
    onContinue();
  }

  function save() {
    setRoutineReminderTime({
      hour: selectedDate.getHours(),
      minute: selectedDate.getMinutes(),
    });
    onContinue();
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: 'time',
      display: 'spinner',
      is24Hour: false,
      positiveButton: { label: 'Set' },
      negativeButton: { label: 'Cancel' },
      onChange: handlePickerChange,
    });
  }

  return (
    <View className="flex-1">
      <View>
        <Text className="text-base font-bold leading-5 text-white/55">
          Reminders make it 65% more likely to stick to BootyBlock after a week.
        </Text>
        <Text className="mt-1 text-[28px] font-bold leading-[33px] text-white">
          What is the best time for you to exercise?
        </Text>
      </View>

      <View className="flex-1 justify-center py-8">
        {Platform.OS === 'ios' ? (
          <View
            className="overflow-hidden rounded-[28px] border px-2"
            style={[routineReminderStyles.nativePickerFrame, { borderColor: routineGlassBorder }]}
          >
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="spinner"
              minuteInterval={1}
              themeVariant="dark"
              textColor={colors.white}
              accentColor={colors.bubble}
              onChange={handlePickerChange}
              style={routineReminderStyles.nativePicker}
            />
          </View>
        ) : (
          <RoutineTimeSurface
            selectedDate={selectedDate}
            onPress={Platform.OS === 'android' ? openAndroidPicker : undefined}
          />
        )}
      </View>

      <View className="gap-4">
        <Pressable
          accessibilityRole="button"
          onPress={skip}
          className="h-11 items-center justify-center self-center rounded-full border px-8"
          style={{ borderColor: routineGlassBorder, backgroundColor: routineGlass }}
        >
          <Text className="text-sm font-black text-white">Skip</Text>
        </Pressable>
        <Button label="Set Routine" onPress={save} />
      </View>
    </View>
  );
}

export default function Insights() {
  const { previewStep } = useLocalSearchParams<{ previewStep?: string }>();
  const parsedPreviewStep = Number(previewStep);
  const initialStep =
    Number.isInteger(parsedPreviewStep) && parsedPreviewStep >= 1 && parsedPreviewStep <= 15
      ? parsedPreviewStep === 5 ? 6 : parsedPreviewStep
      : 6;
  const { ageRange, dailyScreenTimeGoalHours, dailyScreenTimeHours } =
    useBootyblock();
  const posthog = usePostHog();
  const [step, setStep] = useState(initialStep);
  const [selectedApps, setSelectedApps] = useState<string[]>(
    previewStep ? ['TikTok'] : [],
  );
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    previewStep ? ['Addictive app design'] : [],
  );
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(
    previewStep ? ['Mentally Drained'] : [],
  );
  const [selectedTried, setSelectedTried] = useState<string[]>(
    previewStep ? ['Nothing yet'] : [],
  );
  const direction = useStepDirection(step);
  const stepMetadata = insightStepMetadata[step as keyof typeof insightStepMetadata];
  const completeCalculating = useCallback(() => setStep(7), []);
  const darkScreen =
    step === 4 ||
    step === 6 ||
    step === 7 ||
    step === 8 ||
    step === 9 ||
    step === 11 ||
    step === 12 ||
    step === 13 ||
    step === 14 ||
    step === 15;
  const showProgressBar =
    step !== 4 &&
    step !== 6 &&
    step !== 7 &&
    step !== 8 &&
    step !== 9 &&
    step !== 11 &&
    step !== 12 &&
    step !== 13 &&
    step !== 14 &&
    step !== 15;

  const progressStep = previewStep ? step + 8 : stepMetadata.index;
  const choosingApps = step === 1;
  const choosingReasons = step === 2;
  const choosingFeelings = step === 3;
  const choosingTried = step === 10;
  const choices = choosingApps
    ? distractingApps
    : choosingReasons
      ? frictionReasons
      : choosingFeelings
        ? feelingOptions
        : triedMethods;
  const selected = choosingApps
    ? selectedApps
    : choosingReasons
      ? selectedReasons
      : choosingFeelings
        ? selectedFeelings
        : selectedTried;
  const currentDays = daysPerYear(dailyScreenTimeHours);
  const averageDependenceScore = dependenceScore(US_AVERAGE_PHONE_HOURS);
  const fixedResultScore = Math.round(
    averageDependenceScore * (1 + RESULT_PERCENT_HIGHER_THAN_AVERAGE / 100),
  );
  const projectionAgeRange = ageRange;
  const remainingYears = Math.max(1, TARGET_AGE - ageMidpoint(projectionAgeRange));
  const projectedYears = yearsUntilTargetAge(dailyScreenTimeHours, projectionAgeRange);
  const reclaimedYears = Math.max(
    0,
    yearsUntilTargetAge(dailyScreenTimeHours - dailyScreenTimeGoalHours, projectionAgeRange),
  );

  useOnboardingStepAnalytics(
    previewStep ? null : posthog,
    '/onboarding/insights',
    stepMetadata.key,
    stepMetadata.title,
    stepMetadata.index,
    ONBOARDING_STEP_TOTAL,
  );

  function toggle(
    label: string,
    current: string[],
    setSelected: (next: string[]) => void,
    limit = 3,
  ) {
    if (current.includes(label)) {
      setSelected(current.filter((item) => item !== label));
      return;
    }
    if (current.length >= limit) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSelected([...current, label]);
  }

  function back() {
    if (!previewStep && step === 6) {
      router.back();
      return;
    }

    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={darkScreen ? (step === 15 ? routineBackground : currentStateBackground) : undefined}
      backgroundGradient={darkScreen ? (step === 15 ? routineGradient : currentStateGradient) : undefined}
    >
      <OnboardingProgress
        step={progressStep}
        onBack={back}
        showBar={showProgressBar}
        dark={darkScreen}
      />

      <SlidePanel stepKey={step} direction={direction} animateOnMount>
        {choosingApps || choosingReasons || choosingFeelings || choosingTried ? (
          <View className="flex-1">
            {!choosingTried ? (
              <Text className="text-base font-bold leading-6 text-mink">
                {choosingApps
                  ? "Let's find the main time sinks."
                  : choosingReasons
                    ? 'Now the habit behind the habit.'
                    : "Let's zoom in."}
              </Text>
            ) : null}
            <Text className="mt-1 text-[28px] font-bold leading-[33px] text-cocoa">
              {choosingApps
                ? 'Which apps take most of your time?'
                : choosingReasons
                  ? 'What usually makes it hard to quit?'
                  : choosingFeelings
                    ? 'How does using these apps for too long make you feel?'
                    : 'What have you already tried?'}
            </Text>
            {!choosingTried ? (
              <Text className="mt-2 text-sm font-bold text-mink">Choose up to 3</Text>
            ) : null}

            <ScrollView
              className="mt-5 flex-1"
              contentContainerStyle={{ gap: 11, paddingBottom: 18 }}
              showsVerticalScrollIndicator={false}
            >
              {choices.map((choice) => (
                <ChoiceRow
                  key={choice.label}
                  choice={choice}
                  selected={selected.includes(choice.label)}
                  onPress={() =>
                    choosingApps
                      ? toggle(choice.label, selectedApps, setSelectedApps)
                      : choosingReasons
                        ? toggle(choice.label, selectedReasons, setSelectedReasons)
                        : choosingFeelings
                          ? toggle(choice.label, selectedFeelings, setSelectedFeelings)
                          : toggle(choice.label, selectedTried, setSelectedTried, 6)
                  }
                />
              ))}
            </ScrollView>

            <View className="pt-3">
              <Button
                label="Continue"
                disabled={selected.length === 0}
                onPress={() => {
                  if (choosingApps) {
                    setStep(2);
                  } else if (choosingReasons) {
                    setStep(3);
                  } else if (choosingFeelings) {
                    setStep(4);
                  } else {
                    setStep(11);
                  }
                }}
              />
            </View>
          </View>
        ) : step === 4 ? (
          <CurrentStateSlide
            selectedApps={selectedApps}
            selectedFeelings={selectedFeelings}
            onContinue={() => setStep(6)}
          />
        ) : step === 6 ? (
          <CalculatingSlide onComplete={completeCalculating} />
        ) : step === 7 ? (
          <ResultComparisonSlide
            currentScore={fixedResultScore}
            averageScore={averageDependenceScore}
            onContinue={() => setStep(8)}
          />
        ) : step === 8 ? (
          <ProjectionWarningSlide
            currentDays={currentDays}
            projectedYears={projectedYears}
            dailyHours={dailyScreenTimeHours}
            remainingYears={remainingYears}
            onContinue={() => setStep(9)}
          />
        ) : step === 9 ? (
          <ReclaimedTimeSlide
            reclaimedYears={reclaimedYears}
            onContinue={() => setStep(10)}
          />
        ) : step === 11 ? (
          <MethodFeedbackSlide
            selectedTried={selectedTried}
            onContinue={() => setStep(12)}
          />
        ) : step === 12 ? (
          <ReplacementScienceSlide onContinue={() => setStep(13)} />
        ) : step === 13 ? (
          <ExerciseSlide onContinue={() => setStep(14)} />
        ) : step === 14 ? (
          <ScrollUnlockSlide onContinue={() => setStep(15)} />
        ) : (
          <RoutineReminderSlide onContinue={() => router.push('/onboarding/setup')} />
        )}
      </SlidePanel>
    </Screen>
  );
}
