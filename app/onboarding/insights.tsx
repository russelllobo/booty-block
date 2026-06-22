import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AppWindow,
  BadgeAlert,
  BatteryLow,
  Bot,
  Brain,
  CalendarDays,
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
  User,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react-native';
import { ComponentType, ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type Choice = {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
  appIcon?: ImageSourcePropType;
};

type AgeOption = {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
};

const US_AVERAGE_PHONE_HOURS = 4.5;
const TARGET_AGE = 80;
const currentStateBackground = '#07070A';
const currentStateGradient = ['#3A0F26', '#07070A'] as const;
const currentStateRed = '#FF3B4D';
const resultOrange = '#FF6B2A';
const bootyLockGreen = '#5FF2A0';
const exercisePink = colors.bubble;
const starGold = '#FFD76A';
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

const ageOptions: AgeOption[] = [
  { label: 'Under 18', value: 'under-18', icon: User },
  { label: '18-24', value: '18-24', icon: User },
  { label: '25-29', value: '25-29', icon: User },
  { label: '30-40', value: '30-40', icon: User },
  { label: '40 and over', value: '40-plus', icon: CalendarDays },
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
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={[
        'min-h-[62px] flex-row items-center gap-4 rounded-full border-2 px-3 py-2.5',
        selected ? 'border-raspberry bg-petal' : 'border-petal bg-white/75',
      ].join(' ')}
    >
      <View
        className={[
          'h-11 w-11 items-center justify-center rounded-full',
          selected ? 'bg-raspberry' : 'bg-petal',
        ].join(' ')}
      >
        {selected ? (
          <Check size={22} stroke={colors.white} strokeWidth={3} />
        ) : (
          <Icon size={21} stroke={colors.raspberry} strokeWidth={2.4} />
        )}
      </View>
      <Text className="flex-1 text-[15px] font-bold leading-5 text-cocoa">{choice.label}</Text>
    </Pressable>
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
      {children}
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
              <BrandLogo height={38} label="Booty Lock logo" />
              <Text
                className="text-center text-[28px] font-bold leading-[33px]"
                style={{ color: bootyLockGreen }}
              >
                Booty Lock
              </Text>
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
  percentVsAverage,
  onContinue,
}: {
  currentScore: number;
  averageScore: number;
  percentVsAverage: number;
  onContinue: () => void;
}) {
  const comparisonLabel =
    percentVsAverage >= 0
      ? `${percentVsAverage}% higher`
      : `${Math.abs(percentVsAverage)}% lower`;

  return (
    <View className="flex-1">
      <View className="flex-1 justify-between pb-1 pt-1">
        <FadeInStage delay={resultComparisonStageDelay.headline}>
          <View className="px-10">
            <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
              It doesn't look good so far...
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
              <Text style={{ color: resultOrange }}>{comparisonLabel}</Text> than the average!
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

function useCountUpValue(value: number, duration = 850, delay = 0, enabled = true) {
  const animatedValue = useRef(new Animated.Value(enabled ? 0 : value)).current;
  const [displayValue, setDisplayValue] = useState(enabled ? 0 : value);

  useEffect(() => {
    if (!enabled) {
      animatedValue.setValue(value);
      setDisplayValue(value);
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

    animation.start();
    return () => {
      animation.stop();
      animatedValue.removeListener(listener);
    };
  }, [animatedValue, delay, duration, enabled, value]);

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

  return (
    <View className="flex-1">
      <View className="flex-1 justify-between pb-1 pt-1">
        <View className="px-10">
          <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
            At your current rate, you'll spend{' '}
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
          />
          <Text className="mt-2 text-center text-[26px] font-black uppercase tracking-[2px] text-white">
            years
          </Text>

          <Text className="mt-7 max-w-[320px] text-center text-[21px] font-bold leading-8 text-white">
            of your life looking down at your phone.{'\n'}Yep, you read this right.
          </Text>
        </View>

        <View>
          <Button label="Continue" onPress={onContinue} />
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
}: {
  value: number;
  color: string;
  animated?: boolean;
  delay?: number;
}) {
  const displayValue = useCountUpValue(value, 950, delay, animated);

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

          <Button label="Continue" onPress={onContinue} />
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
    <Animated.Text
      style={{
        fontSize: 20,
        fontWeight: '900',
        color: exercisePink,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      +1 min
    </Animated.Text>
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

export default function Insights() {
  const { ageRange, dailyScreenTimeGoalHours, dailyScreenTimeHours, setAgeRange } =
    useBootyblock();
  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedTried, setSelectedTried] = useState<string[]>([]);
  const [selectedAgeRange, setSelectedAgeRange] = useState('');
  const direction = useStepDirection(step);

  const progressStep = step + 5;
  const choosingApps = step === 1;
  const choosingReasons = step === 2;
  const choosingFeelings = step === 3;
  const choosingTried = step === 9;
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
  const currentDependenceScore = dependenceScore(dailyScreenTimeHours);
  const averageDependenceScore = dependenceScore(US_AVERAGE_PHONE_HOURS);
  const projectionAgeRange = selectedAgeRange || ageRange;
  const remainingYears = Math.max(1, TARGET_AGE - ageMidpoint(projectionAgeRange));
  const projectedYears = yearsUntilTargetAge(dailyScreenTimeHours, projectionAgeRange);
  const reclaimedYears = Math.max(
    0,
    yearsUntilTargetAge(dailyScreenTimeHours - dailyScreenTimeGoalHours, projectionAgeRange),
  );
  const percentVsAverage = Math.round(
    ((dailyScreenTimeHours - US_AVERAGE_PHONE_HOURS) / US_AVERAGE_PHONE_HOURS) * 100,
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
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={
        step === 4 || step === 6 || step === 7 || step === 8 || step === 10 || step === 11 || step === 12
          ? currentStateBackground
          : undefined
      }
      backgroundGradient={
        step === 4 || step === 6 || step === 7 || step === 8 || step === 10 || step === 11 || step === 12
          ? currentStateGradient
          : undefined
      }
    >
      <OnboardingProgress
        step={progressStep}
        onBack={back}
        showBar={step !== 4 && step !== 6 && step !== 7 && step !== 8 && step !== 11 && step !== 12}
        dark={step === 4 || step === 6 || step === 7 || step === 8 || step === 10 || step === 11 || step === 12}
      />

      <SlidePanel stepKey={step} direction={direction}>
        {choosingApps || choosingReasons || choosingFeelings || choosingTried ? (
          <View className="flex-1">
            <Text className="text-base font-bold leading-6 text-mink">
              {choosingApps
                ? "Let's find the main time sinks."
                : choosingReasons
                  ? 'Now the habit behind the habit.'
                  : choosingFeelings
                    ? "Let's zoom in."
                    : "You said these apps make you insecure, so I'd like to ask:"}
            </Text>
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
                    setStep(10);
                  }
                }}
              />
            </View>
          </View>
        ) : step === 4 ? (
          <CurrentStateSlide
            selectedApps={selectedApps}
            selectedFeelings={selectedFeelings}
            onContinue={() => setStep(5)}
          />
        ) : step === 5 ? (
          <View className="flex-1">
            <Text className="text-base font-bold leading-6 text-mink">
              This helps estimate the long-term impact.
            </Text>
            <Text className="mt-2 text-[28px] font-bold leading-[33px] text-cocoa">
              How old are you?
            </Text>
            <Text className="mt-2 text-sm font-bold text-mink">
              We use age range only for onboarding projections.
            </Text>

            <View className="flex-1 justify-center gap-3 py-6">
              {ageOptions.map(({ label, value, icon: Icon }) => {
                const selected = selectedAgeRange === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedAgeRange(value)}
                    className={[
                      'min-h-[66px] flex-row items-center gap-4 rounded-full border-2 px-4 py-3',
                      selected ? 'border-raspberry bg-petal' : 'border-petal bg-white/75',
                    ].join(' ')}
                  >
                    <View
                      className={[
                        'h-11 w-11 items-center justify-center rounded-full',
                        selected ? 'bg-raspberry' : 'bg-petal',
                      ].join(' ')}
                    >
                      <Icon
                        size={21}
                        stroke={selected ? colors.white : colors.raspberry}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text className="flex-1 text-base font-bold text-cocoa">{label}</Text>
                    {selected ? <Check size={22} stroke={colors.raspberry} strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Button
              label="Continue"
              disabled={!selectedAgeRange}
              onPress={() => {
                setAgeRange(selectedAgeRange);
                setStep(6);
              }}
            />
          </View>
        ) : step === 6 ? (
          <ResultComparisonSlide
            currentScore={currentDependenceScore}
            averageScore={averageDependenceScore}
            percentVsAverage={percentVsAverage}
            onContinue={() => setStep(7)}
          />
        ) : step === 7 ? (
          <ProjectionWarningSlide
            currentDays={currentDays}
            projectedYears={projectedYears}
            dailyHours={dailyScreenTimeHours}
            remainingYears={remainingYears}
            onContinue={() => setStep(8)}
          />
        ) : step === 8 ? (
          <ReclaimedTimeSlide
            reclaimedYears={reclaimedYears}
            onContinue={() => setStep(9)}
          />
        ) : step === 10 ? (
          <MethodFeedbackSlide
            selectedTried={selectedTried}
            onContinue={() => setStep(11)}
          />
        ) : step === 11 ? (
          <ReplacementScienceSlide onContinue={() => setStep(12)} />
        ) : (
          <ExerciseSlide onContinue={() => router.push('/onboarding/screentime')} />
        )}
      </SlidePanel>
    </Screen>
  );
}
