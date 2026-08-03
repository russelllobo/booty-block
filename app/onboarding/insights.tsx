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
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Text } from '../../components/AppText';

import { BrandLockup } from '../../components/BrandLockup';
import { Button, ButtonGlassRevealDelay } from '../../components/Button';
import {
  AnimatedOnboardingOption,
  AnimatedOnboardingOptionIcon,
} from '../../components/AnimatedOnboardingOption';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import {
  SlidePanel,
  type SlideDirection,
  useSlideTransitionLayer,
  useStepDirection,
} from '../../components/SlidePanel';
import {
  colors,
  onboardingLightBackground,
  onboardingLightGradient,
  shadow,
} from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import {
  HIDDEN_ONBOARDING_STEPS,
  ONBOARDING_STEP_TOTAL,
  ONBOARDING_STEPS,
} from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type Choice = {
  label: string;
  displayLabel?: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
  appIcon?: ImageSourcePropType;
};

const TARGET_AGE = 80;
const currentStateRed = '#FF3B4D';
const resultHighlight = colors.raspberry;
const resultStoryBackground = onboardingLightBackground;
const resultStoryGradient = onboardingLightGradient;
const bootyLockGreen = '#168A50';
const exercisePink = colors.raspberry;
const insightStepMetadata = {
  1: HIDDEN_ONBOARDING_STEPS.timeSinkApps,
  2: HIDDEN_ONBOARDING_STEPS.habitFriction,
  3: HIDDEN_ONBOARDING_STEPS.usageFeelings,
  4: HIDDEN_ONBOARDING_STEPS.currentState,
  6: ONBOARDING_STEPS.lifetimeProjection,
  7: ONBOARDING_STEPS.squatTimeTrade,
  8: ONBOARDING_STEPS.reclaimedTime,
  10: ONBOARDING_STEPS.previousMethods,
  11: ONBOARDING_STEPS.methodFeedback,
  13: ONBOARDING_STEPS.exerciseLink,
  14: ONBOARDING_STEPS.scrollUnlock,
} as const;
const currentStateStageDelay = {
  current: 0,
  bootyLock: 1000,
  research: 1700,
  button: 2400,
};
const featureStoryButtonDelay = 700;
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
  { label: 'Nothing yet', displayLabel: 'nothing yet', icon: RotateCcw },
  { label: 'Screen Time limits', displayLabel: 'screen time limits', icon: TimerReset },
  { label: 'Deleting addictive apps', displayLabel: 'deleting addictive apps', icon: X },
  { label: 'Browser-only versions', displayLabel: 'browser-only versions', icon: AppWindow },
  { label: 'Digital detox', displayLabel: 'digital detox', icon: Sparkles },
  { label: 'Other app blockers', displayLabel: 'other app blockers', icon: ShieldCheck },
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
    stars: 3,
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

function yearsUntilTargetAge(hoursPerDay: number, ageRange: string) {
  const remainingYears = Math.max(1, TARGET_AGE - ageMidpoint(ageRange));
  return (hoursPerDay * remainingYears) / 24;
}

function ChoiceRow({
  choice,
  selected,
  onPress,
  number,
}: {
  choice: Choice;
  selected: boolean;
  onPress: () => void;
  number?: number;
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
        {number !== undefined ? (
          <Text
            className="text-lg font-black"
            style={{ color: selected ? colors.white : colors.raspberry }}
          >
            {number}
          </Text>
        ) : selected ? (
          <Check size={22} stroke={colors.white} strokeWidth={3} />
        ) : (
          <Icon size={21} stroke={colors.raspberry} strokeWidth={2.4} />
        )}
      </AnimatedOnboardingOptionIcon>
      <Text className="flex-1 text-[15px] font-bold leading-5 text-cocoa">
        {choice.displayLabel ?? choice.label}
      </Text>
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
      <Text className="text-[13px] font-black text-cocoa">{label}</Text>
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
      <Text className="max-w-[76px] text-center text-[10px] font-black text-cocoa" numberOfLines={1}>
        {choice.label}
      </Text>
    </View>
  );
}

function FadeInStage({
  children,
  delay,
  fade = true,
}: {
  children: ReactNode;
  delay: number;
  fade?: boolean;
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
    <Animated.View
      style={[
        fade ? { opacity } : null,
        { transform: [{ translateY }] },
      ]}
    >
      <ButtonGlassRevealDelay delayMs={delay + 520}>
        {children}
      </ButtonGlassRevealDelay>
    </Animated.View>
  );
}

function SlideSyncedStage({ children }: { children: ReactNode }) {
  const transitionLayer = useSlideTransitionLayer();
  const animatedStyle = useAnimatedStyle(() => {
    if (!transitionLayer || transitionLayer.role === 'outgoing') return {};

    return {
      opacity: interpolate(transitionLayer.progress.value, [0, 0.72, 1], [0, 1, 1]),
      transform: [
        {
          translateY: interpolate(transitionLayer.progress.value, [0, 0.72, 1], [8, 0, 0]),
        },
      ],
    };
  }, [transitionLayer]);

  return <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>;
}

function SwipeInStage({
  children,
  delay,
  direction,
}: {
  children: ReactNode;
  delay: number;
  direction: SlideDirection;
}) {
  const startX = direction === 'back' ? -72 : 72;
  const translateX = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    translateX.setValue(startX);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, startX, translateX]);

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

function CountUpNumber({
  target,
  delay = 0,
  duration = 1200,
}: {
  target: number;
  delay?: number;
  duration?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    progress.setValue(0);
    setDisplayValue(0);

    const listenerId = progress.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: target,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) setDisplayValue(target);
    });

    return () => {
      animation.stop();
      progress.removeListener(listenerId);
    };
  }, [delay, duration, progress, target]);

  return <Text>{displayValue}</Text>;
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
              className="text-center text-[28px] font-semibold leading-[33px]"
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

        <View className="my-8 h-0.5 w-[82%] rounded-full bg-cocoa/15" />

        <FadeInStage delay={currentStateStageDelay.bootyLock}>
          <View className="w-full items-center">
            <View className="flex-row items-center justify-center gap-3">
              <Text
                className="text-center text-[28px] font-semibold leading-[33px]"
                style={{ color: bootyLockGreen }}
              >
                With
              </Text>
              <BrandLockup
                height={38}
                label="bootyblock logo"
                textColor={colors.cocoa}
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
          <View className="mt-7 rounded-[20px] border border-cocoa/10 bg-white/70 px-4 py-3">
            <Text className="text-xs font-black uppercase tracking-[1.5px] text-cocoa">
              The research
            </Text>
            <Text className="mt-2 text-sm font-bold leading-5 text-cocoa">
              Heavy social media use is associated with lower self-esteem among
              adolescents, according to PubMed Central research.
            </Text>
          </View>
        </FadeInStage>
      </View>

      <FadeInStage delay={currentStateStageDelay.button} fade={false}>
        <View className="pt-3">
          <Button label="continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function ResultStorySlide({
  emoji,
  heroImage,
  heroImageAccessibilityLabel,
  headline,
  headlineBold = true,
  leadText,
  supportingText,
  onContinue,
  syncEntranceWithSlideTransition = false,
}: {
  emoji?: string;
  heroImage?: ImageSourcePropType;
  heroImageAccessibilityLabel?: string;
  headline: ReactNode;
  headlineBold?: boolean;
  leadText?: string;
  supportingText?: string;
  onContinue: () => void;
  syncEntranceWithSlideTransition?: boolean;
}) {
  const leadTextDelay = heroImage ? 360 : 100;
  const headlineDelay = emoji ? 680 : leadText ? 720 : 100;
  const supportingTextDelay = headlineDelay + 620;
  const buttonDelay = emoji
    ? 1240
    : supportingText
      ? supportingTextDelay + 560
      : leadText
        ? headlineDelay + 560
        : 560;

  return (
    <View
      className="flex-1 justify-between pt-1"
      style={{ paddingBottom: 36 }}
    >
      <View className="flex-1 items-center justify-center">
        {emoji ? (
          <FadeInStage delay={80}>
            <Text
              accessibilityLabel="Shocked face"
              className="mb-4 text-center text-[78px] leading-[92px]"
            >
              {emoji}
            </Text>
          </FadeInStage>
        ) : null}

        <View className="w-full">
          {heroImage && leadText ? (
            <FadeInStage delay={80}>
              <View className="w-full items-center px-5">
                <Image
                  source={heroImage}
                  accessibilityLabel={heroImageAccessibilityLabel}
                  resizeMode="contain"
                  fadeDuration={0}
                  style={{ width: 190, height: 240, marginBottom: 14 }}
                />
              </View>
            </FadeInStage>
          ) : null}

          {leadText ? (
            <FadeInStage delay={leadTextDelay}>
              <View className="w-full items-center px-5">
                <Text
                  className="mb-9 max-w-[320px] text-center text-[16px] font-bold leading-[22px]"
                  style={{ color: colors.mink }}
                >
                  {leadText}
                </Text>
              </View>
            </FadeInStage>
          ) : null}

          {syncEntranceWithSlideTransition ? (
            <SlideSyncedStage>
              <View className="w-full items-center px-5">
                {heroImage && !leadText ? (
                  <Image
                    source={heroImage}
                    accessibilityLabel={heroImageAccessibilityLabel}
                    resizeMode="contain"
                    fadeDuration={0}
                    style={{ width: 220, height: 300, marginBottom: 16 }}
                  />
                ) : null}
                <Text
                  className={[
                    'max-w-[350px] text-center',
                    headlineBold ? 'font-black' : 'font-semibold',
                    leadText
                      ? 'text-[44px] leading-[50px]'
                      : 'text-[28px] leading-[33px]',
                  ].join(' ')}
                  style={{ color: leadText ? resultHighlight : colors.cocoa }}
                >
                  {headline}
                </Text>

                {supportingText ? (
                  <Text
                    className="mt-4 max-w-[310px] text-center text-[15px] font-bold leading-[21px]"
                    style={{ color: colors.mink }}
                  >
                    {supportingText}
                  </Text>
                ) : null}
              </View>
            </SlideSyncedStage>
          ) : (
            <FadeInStage delay={headlineDelay}>
            <View className="w-full items-center px-5">
              {heroImage && !leadText ? (
                <Image
                  source={heroImage}
                  accessibilityLabel={heroImageAccessibilityLabel}
                  resizeMode="contain"
                  fadeDuration={0}
                  style={{ width: 220, height: 300, marginBottom: 16 }}
                />
              ) : null}
              <Text
                className={[
                  'max-w-[350px] text-center',
                  headlineBold ? 'font-black' : 'font-semibold',
                  leadText
                    ? 'text-[44px] leading-[50px]'
                    : 'text-[28px] leading-[33px]',
                ].join(' ')}
                style={{ color: leadText ? resultHighlight : colors.cocoa }}
              >
                {headline}
              </Text>
            </View>
            </FadeInStage>
          )}

          {supportingText && !syncEntranceWithSlideTransition ? (
            <FadeInStage delay={supportingTextDelay}>
              <View className="w-full items-center px-5">
                <Text
                  className="mt-4 max-w-[310px] text-center text-[15px] font-bold leading-[21px]"
                  style={{ color: colors.mink }}
                >
                  {supportingText}
                </Text>
              </View>
            </FadeInStage>
          ) : null}
        </View>
      </View>

      {syncEntranceWithSlideTransition ? (
        <Button
          label="continue"
          onPress={onContinue}
          pressDelayMs={0}
          animateGlassReveal={false}
        />
      ) : (
        <FadeInStage delay={buttonDelay} fade={false}>
          <Button label="continue" onPress={onContinue} />
        </FadeInStage>
      )}
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
              style={{ color: resultHighlight }}
            >
              {hasTriedMethod
                ? 'big respect for tackling something tough.'
                : 'you are starting with a clean slate.'}
            </Text>
          </View>
        </FadeInStage>

        <FadeInStage delay={currentStateStageDelay.bootyLock}>
          <View className="w-full items-center px-10">
            <Text
              className="mt-3 text-center text-base font-bold leading-5"
              style={{ color: colors.cocoa }}
            >
              we did the research, here's the breakdown:
            </Text>
          </View>
        </FadeInStage>

        <FadeInStage delay={currentStateStageDelay.research}>
          <View className="mt-8 rounded-[22px] border border-cocoa/10 bg-white/70 px-4 py-4">
            <View className="flex-row items-center gap-2.5">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-petal/70">
                <Icon size={15} stroke={colors.raspberry} strokeWidth={2.5} />
              </View>
              <Text className="flex-1 text-sm font-black text-cocoa">
                {feedback.title.toLowerCase()}
              </Text>
              <View className="flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Star
                    key={rating}
                    size={15}
                    fill={rating <= feedback.stars ? currentStateRed : 'transparent'}
                    stroke={rating <= feedback.stars ? currentStateRed : 'rgba(58,31,44,0.28)'}
                    strokeWidth={2.2}
                  />
                ))}
              </View>
            </View>

            <Text
              className="mt-3 text-[13px] font-bold leading-5"
              style={{ color: colors.cocoa }}
            >
              {feedback.summary.toLowerCase()}
            </Text>
          </View>
        </FadeInStage>
      </View>

      <FadeInStage delay={currentStateStageDelay.button} fade={false}>
        <View className="pt-3">
          <Button label="see how bootyblock works" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

function ExerciseSlide({
  direction,
  onContinue,
}: {
  direction: SlideDirection;
  onContinue: () => void;
}) {
  return (
    <View className="flex-1">
      <SwipeInStage delay={currentStateStageDelay.current} direction={direction}>
        <View className="w-full items-center px-8 pt-2">
          <Text
            className="text-center text-[26px] font-bold leading-[32px]"
            allowFontScaling={false}
            style={{ color: colors.cocoa }}
          >
            you can save up screen{'\n'}
            time by <Text style={{ color: exercisePink }}>squatting</Text>{'\n'}
            whenever you want.
          </Text>
        </View>
      </SwipeInStage>

      <View className="flex-1 items-center justify-center">
        <SwipeInStage delay={currentStateStageDelay.current} direction={direction}>
          <Image
            source={require('../../assets/onboarding/squat-static-transparent.png')}
            accessibilityLabel="Woman holding a squat"
            resizeMode="contain"
            fadeDuration={0}
            style={{ width: 336, height: 336 }}
          />
        </SwipeInStage>
      </View>

      <FadeInStage delay={featureStoryButtonDelay} fade={false}>
        <View className="pt-3">
          <Button label="continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

const scrollingFeedCards = [
  { colors: ['#54203D', '#E91E78'] as const, accent: '#FFBDD9', orbTop: 32, orbLeft: 25 },
  { colors: ['#182339', '#5866E9'] as const, accent: '#BBC4FF', orbTop: 82, orbLeft: 62 },
  { colors: ['#54203D', '#E91E78'] as const, accent: '#FFBDD9', orbTop: 32, orbLeft: 25 },
];

function ScrollingFeedCard({
  colors: cardColors,
  accent,
  orbTop,
  orbLeft,
}: (typeof scrollingFeedCards)[number]) {
  return (
    <View style={{ height: 220, paddingHorizontal: 10, paddingTop: 8 }}>
      <LinearGradient
        colors={cardColors}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 19,
          padding: 12,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: orbTop,
            left: orbLeft,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: accent,
            opacity: 0.22,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: -24,
            bottom: 22,
            width: 116,
            height: 116,
            borderRadius: 58,
            borderWidth: 18,
            borderColor: accent,
            opacity: 0.16,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: accent,
              opacity: 0.9,
            }}
          />
          <View style={{ gap: 4 }}>
            <View
              style={{
                width: 54,
                height: 5,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.82)',
              }}
            />
            <View
              style={{
                width: 32,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.38)',
              }}
            />
          </View>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.7)',
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={21} stroke="#FFFFFF" strokeWidth={3} />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <View
            style={{
              width: 102,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.84)',
            }}
          />
          <View
            style={{
              width: 72,
              height: 5,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.42)',
            }}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function ScrollUnlockIllustration() {
  const feedPosition = useRef(new Animated.Value(0)).current;
  const swipePosition = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const swipeUp = () => Animated.parallel([
      Animated.sequence([
        Animated.timing(swipeOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(360),
        Animated.timing(swipeOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(swipePosition, {
        toValue: 1,
        duration: 660,
        easing: Easing.bezier(0.22, 0.85, 0.28, 1),
        useNativeDriver: true,
      }),
    ]);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          swipeUp(),
          Animated.timing(feedPosition, {
            toValue: 1,
            duration: 760,
            easing: Easing.bezier(0.22, 0.85, 0.28, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(900),
        Animated.timing(swipePosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          swipeUp(),
          Animated.timing(feedPosition, {
            toValue: 2,
            duration: 760,
            easing: Easing.bezier(0.22, 0.85, 0.28, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(900),
        Animated.timing(feedPosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(swipePosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    glowAnimation.start();

    return () => {
      animation.stop();
      glowAnimation.stop();
    };
  }, [feedPosition, glow, swipeOpacity, swipePosition]);

  const feedTranslateY = feedPosition.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -220, -440],
  });
  const fingerTranslateY = swipePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [78, -78],
  });
  const fingerScale = swipePosition.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0.88, 1, 0.92],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });

  return (
    <View className="items-center">
      <View style={{ width: 294, height: 326, alignItems: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 15,
            width: 204,
            height: 270,
            borderRadius: 62,
            backgroundColor: 'rgba(233, 30, 120, 0.22)',
            opacity: glowOpacity,
            shadowColor: exercisePink,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.32,
            shadowRadius: 34,
            transform: [{ scale: glowScale }],
          }}
        />

        <View
          style={{
            width: 178,
            height: 286,
            borderRadius: 38,
            borderWidth: 3,
            borderColor: exercisePink,
            backgroundColor: '#09070B',
            padding: 8,
            shadowColor: exercisePink,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.22,
            shadowRadius: 24,
            elevation: 7,
          }}
        >
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: 29,
              backgroundColor: '#120A10',
            }}
          >
            <View
              style={{
                height: 36,
                zIndex: 3,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                backgroundColor: '#120A10',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 1.5,
                    borderColor: exercisePink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '900', color: exercisePink }}>s</Text>
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>for you</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {[0, 1, 2].map((dot) => (
                  <View
                    key={dot}
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Animated.View style={{ transform: [{ translateY: feedTranslateY }] }}>
                {scrollingFeedCards.map((card, index) => (
                  <ScrollingFeedCard key={index} {...card} />
                ))}
              </Animated.View>

              <LinearGradient
                pointerEvents="none"
                colors={['rgba(18,10,16,0)', '#120A10']}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 24,
                }}
              />
            </View>
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 8,
              left: 66,
              width: 46,
              height: 5,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)',
              zIndex: 5,
            }}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 35,
            top: 136,
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.72)',
            backgroundColor: exercisePink,
            opacity: swipeOpacity,
            shadowColor: exercisePink,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.36,
            shadowRadius: 12,
            elevation: 5,
            transform: [{ translateY: fingerTranslateY }, { scale: fingerScale }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 10,
              width: 20,
              height: 12,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.34)',
            }}
          />
        </Animated.View>
      </View>

    </View>
  );
}

function ScrollUnlockSlide({
  direction,
  onContinue,
}: {
  direction: SlideDirection;
  onContinue: () => void;
}) {
  return (
    <View className="flex-1">
      <SwipeInStage delay={currentStateStageDelay.current} direction={direction}>
        <View className="w-full items-center px-2 pt-2">
          <Text
            className="text-center text-[26px] font-bold leading-[32px]"
            allowFontScaling={false}
            style={{ color: colors.cocoa }}
          >
            you can use your saved-up{'\n'}
            screen time <Text style={{ color: exercisePink }}>anytime.</Text>
          </Text>
        </View>
      </SwipeInStage>

      <View className="flex-1 items-center justify-center">
        <SwipeInStage delay={currentStateStageDelay.current} direction={direction}>
          <ScrollUnlockIllustration />
        </SwipeInStage>
      </View>

      <FadeInStage delay={featureStoryButtonDelay} fade={false}>
        <View className="pt-3">
          <Button label="continue" onPress={onContinue} />
        </View>
      </FadeInStage>
    </View>
  );
}

export default function Insights() {
  const { previewStep, resumeStep } = useLocalSearchParams<{ previewStep?: string; resumeStep?: string }>();
  const parsedPreviewStep = Number(previewStep);
  const resumedStepEntry = Object.entries(insightStepMetadata).find(
    ([, metadata]) => metadata.key === resumeStep,
  );
  const resumedStep = resumedStepEntry ? Number(resumedStepEntry[0]) : 6;
  const initialStep =
    Number.isInteger(parsedPreviewStep) && parsedPreviewStep >= 1 && parsedPreviewStep <= 14
      ? parsedPreviewStep === 5
        ? 6
        : parsedPreviewStep === 12
          ? 13
          : parsedPreviewStep
      : resumedStep;
  const {
    ageRange,
    dailyScreenTimeHours,
    onboardingChoices,
    profileName,
    setOnboardingChoice,
  } =
    useBootyblock();
  const posthog = usePostHog();
  const [step, setStep] = useState(initialStep);
  const [selectedApps, setSelectedApps] = useState<string[]>(previewStep
    ? ['TikTok']
    : onboardingChoices.timeSinkApps ?? []);
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    previewStep ? ['Addictive app design'] : onboardingChoices.habitFriction ?? [],
  );
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(
    previewStep ? ['Mentally Drained'] : onboardingChoices.usageFeelings ?? [],
  );
  const [selectedTried, setSelectedTried] = useState<string[]>(
    previewStep ? ['Nothing yet'] : onboardingChoices.previousMethods ?? [],
  );
  const direction = useStepDirection(step);
  const stepMetadata = insightStepMetadata[step as keyof typeof insightStepMetadata];
  const resultStoryScreen = step === 6 || step === 7 || step === 8;
  const featureStoryScreen =
    step === 4 ||
    step === 11 ||
    step === 13 ||
    step === 14;
  const showProgressBar =
    step !== 4 &&
    step !== 6 &&
    step !== 7 &&
    step !== 8 &&
    step !== 11 &&
    step !== 13 &&
    step !== 14;

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
  const projectionAgeRange = ageRange;
  const projectedYears = yearsUntilTargetAge(dailyScreenTimeHours, projectionAgeRange);
  const projectedYearLabel = Math.max(1, Math.round(projectedYears));
  const projectedYearUnit = projectedYearLabel === 1 ? 'year' : 'years';
  const firstName = profileName.trim().split(/\s+/)[0] || 'You';

  useOnboardingStepAnalytics(
    previewStep ? null : posthog,
    '/onboarding/insights',
    stepMetadata.key,
    stepMetadata.title,
    stepMetadata.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    if (previewStep) return;
    setOnboardingChoice('timeSinkApps', selectedApps);
  }, [previewStep, selectedApps, setOnboardingChoice]);

  useEffect(() => {
    if (previewStep) return;
    setOnboardingChoice('habitFriction', selectedReasons);
  }, [previewStep, selectedReasons, setOnboardingChoice]);

  useEffect(() => {
    if (previewStep) return;
    setOnboardingChoice('usageFeelings', selectedFeelings);
  }, [previewStep, selectedFeelings, setOnboardingChoice]);

  useEffect(() => {
    if (previewStep) return;
    setOnboardingChoice('previousMethods', selectedTried);
  }, [previewStep, selectedTried, setOnboardingChoice]);

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

    if (step === 10) {
      setStep(8);
      return;
    }

    if (step === 13) {
      setStep(11);
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
      backgroundColor={
        resultStoryScreen
          ? resultStoryBackground
          : featureStoryScreen
            ? onboardingLightBackground
            : undefined
      }
      backgroundGradient={
        resultStoryScreen
          ? resultStoryGradient
          : featureStoryScreen
            ? onboardingLightGradient
            : undefined
      }
    >
      <OnboardingProgress
        step={progressStep}
        onBack={back}
        showBar={showProgressBar}
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
            <Text
              className={[
                choosingTried ? 'mt-7' : 'mt-1',
                'text-[28px] font-semibold leading-[33px] text-cocoa',
              ].join(' ')}
            >
              {choosingApps
                ? 'Which apps take most of your time?'
                : choosingReasons
                  ? 'What usually makes it hard to quit?'
                  : choosingFeelings
                    ? 'How does using these apps for too long make you feel?'
                    : 'what have you already tried?'}
            </Text>
            {!choosingTried ? (
              <Text className="mt-2 text-sm font-bold text-mink">Choose up to 3</Text>
            ) : null}

            <ScrollView
              className="mt-5 flex-1"
              contentContainerStyle={{ gap: 11, paddingBottom: 18 }}
              showsVerticalScrollIndicator={false}
            >
              {choices.map((choice, index) => (
                <ChoiceRow
                  key={choice.label}
                  choice={choice}
                  selected={selected.includes(choice.label)}
                  number={choosingTried ? index + 1 : undefined}
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
                label="continue"
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
          <ResultStorySlide
            emoji="🤯"
            headlineBold={false}
            headline={(
              <>
                {firstName}, at this rate you're gonna spend{' '}
                <Text style={{ color: resultHighlight }}>
                  {projectedYearLabel} {projectedYearUnit}
                </Text>{' '}
                of your life on your phone.
              </>
            )}
            onContinue={() => setStep(7)}
          />
        ) : step === 7 ? (
          <ResultStorySlide
            heroImage={require('../../assets/onboarding/body-transformation-transparent.png')}
            heroImageAccessibilityLabel="Woman showing a full-body transformation"
            headlineBold={false}
            syncEntranceWithSlideTransition
            headline={(
              <>
                you can make meaningful changes to your body in{' '}
                <Text style={{ color: resultHighlight }}>30 days.</Text>
              </>
            )}
            supportingText="if you traded your screen time for squat time."
            onContinue={() => setStep(8)}
          />
        ) : step === 8 ? (
          <ResultStorySlide
            heroImage={require('../../assets/onboarding/reclaimed-time-woman-clock.png')}
            heroImageAccessibilityLabel="Woman encircled by a rewind arrow beside a clock"
            leadText="...the good news is, we'll help you give"
            headline={(
              <>
                <CountUpNumber target={projectedYearLabel} delay={720} />{' '}
                {projectedYearUnit}{'\n'}
                back to your body.
              </>
            )}
            onContinue={() => setStep(10)}
          />
        ) : step === 11 ? (
          <MethodFeedbackSlide
            selectedTried={selectedTried}
            onContinue={() => setStep(13)}
          />
        ) : step === 13 ? (
          <ExerciseSlide direction={direction} onContinue={() => setStep(14)} />
        ) : step === 14 ? (
          <ScrollUnlockSlide
            direction={direction}
            onContinue={() => router.push('/onboarding/setup')}
          />
        ) : (
          null
        )}
      </SlidePanel>
    </Screen>
  );
}
