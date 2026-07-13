import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { AppWindow, Flame, Lock, Unlock, X } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { PeachIcon } from '../../components/PeachIcon';
import { Screen } from '../../components/Screen';
import { PEACHES_PER_MINUTE, PEACHES_PER_SQUAT } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { getBootyProgress } from '../../lib/progression';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type SpotlightKey = 'balance' | 'earn' | 'streak';

type HomeTip = {
  id: SpotlightKey;
  eyebrow: string;
  title: string;
  body: string;
};

const HOLD_TO_UNLOCK_MS = 920;

type UnlockAction = 'spend' | 'earn';

function RoughUnlockPrompt() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.roughUnlockPrompt}
    >
      <Svg height="52" style={styles.roughUnlockArrow} viewBox="0 0 300 52" width="100%">
        <Path
          d="M 213 43 C 226 28, 209 11, 164 8"
          fill="none"
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeWidth={3.2}
        />
        <Path
          d="M 164 8 C 174 10, 181 9, 189 5 M 164 8 C 171 16, 174 21, 175 28"
          fill="none"
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.2}
        />
      </Svg>
      <Text style={styles.roughUnlockText}>hold to unlock</Text>
    </View>
  );
}

const homeTips: HomeTip[] = [
  {
    id: 'balance',
    eyebrow: 'home',
    title: 'Your lock status lives here',
    body: 'See whether your distracting apps are locked, how many are protected, and what is ready to use.',
  },
  {
    id: 'earn',
    eyebrow: 'Move first',
    title: 'Earn Peaches with squats',
    body: 'Start a quick squat session whenever you want more Peaches for scrolling time.',
  },
  {
    id: 'streak',
    eyebrow: 'Momentum',
    title: 'Build your streak',
    body: 'Every day you earn Peaches keeps your progress visible at the top of Home.',
  },
];

function formatBankDuration(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const remainingSeconds = roundedSeconds % 3600;
  const durationMinutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const minuteLabel = String(durationMinutes).padStart(hours > 0 ? 2 : 1, '0');
  const secondLabel = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minuteLabel}:${secondLabel}`;
  }

  return `${minuteLabel}:${secondLabel}`;
}

function remainingTimeAccessibilityLabel(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const remainingSeconds = roundedSeconds % 3600;
  const durationMinutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const parts = [
    hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : null,
    durationMinutes ? `${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'}` : null,
    `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
  ].filter(Boolean);

  return `${parts.join(', ')} remaining in current unlock window`;
}

function TourHighlight({
  id,
  activeId,
  children,
}: {
  id: SpotlightKey;
  activeId: SpotlightKey | null;
  children: ReactNode;
}) {
  const active = id === activeId;

  return (
    <View style={[styles.highlightWrap, active ? styles.highlightActive : null]}>
      {children}
      {active ? <View pointerEvents="none" style={styles.highlightRing} /> : null}
    </View>
  );
}

function HomeTourOverlay({
  step,
  onNext,
}: {
  step: number;
  onNext: () => void;
}) {
  const tip = homeTips[step];
  const isLastStep = step === homeTips.length - 1;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Home tour background"
        onPress={() => {}}
        style={styles.dimOverlay}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Home tour touch blocker"
        onPress={() => {}}
        style={styles.touchBlocker}
      />
      <View pointerEvents="box-none" style={styles.tourCardWrap}>
        <View
          className="self-center rounded-[30px] border border-white/80 bg-white px-5 py-5"
          style={styles.tourCard}
        >
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-xs font-black uppercase tracking-wide text-mink">{tip.eyebrow}</Text>
              <Text className="mt-1 text-[22px] font-black leading-[26px] text-cocoa">{tip.title}</Text>
              <Text className="mt-2 text-[15px] font-bold leading-5 text-mink">{tip.body}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between gap-4">
            <View />
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                className="flex-row items-center gap-2 rounded-full bg-raspberry px-4 py-2.5"
              >
                <Text className="text-sm font-black text-white">
                  {isLastStep ? 'Done' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

export default function Home() {
  const params = useLocalSearchParams<{ appTour?: string; openUnlock?: '1' | 'spend'; tourStep?: string }>();
  const {
    peachBalance,
    usageWindowSeconds,
    requestedPeaches,
    setRequestedPeaches,
    spendPeachesForMinutes,
    currentStreak,
    unlockHistory,
    bonusXp,
    syncUsageWindow,
    hasAppAccess,
    selectedAppsConfigured,
    requestSubscriptionAccess,
    subscriptionConfigured,
    subscriptionError,
  } = useBootyblock();
  const [, setTick] = useState(Date.now);
  const [tourStep, setTourStep] = useState(params.tourStep === 'streak' ? 2 : 0);
  const [unlockPromptVisible, setUnlockPromptVisible] = useState(false);
  const [unlockAction, setUnlockAction] = useState<UnlockAction | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(1);
  const [unlocking, setUnlocking] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const holdFill = useRef(new Animated.Value(0)).current;
  const unlockPromptProgress = useRef(new Animated.Value(0)).current;
  const unlockSelectorProgress = useRef(new Animated.Value(0)).current;
  const holdAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const holdCompleteRef = useRef(false);
  const shieldPromptHandledRef = useRef(false);
  const tourActive = params.appTour === 'home';
  const activeSpotlight = tourActive ? homeTips[tourStep]?.id ?? null : null;
  const bootyProgress = useMemo(
    () => getBootyProgress(unlockHistory, currentStreak, bonusXp),
    [unlockHistory, currentStreak, bonusXp],
  );
  const bootyProgressPercent = `${Math.round(bootyProgress.progressRatio * 100)}%` as `${number}%`;

  useEffect(() => {
    if (!tourActive) return;
    if (params.tourStep === 'streak') {
      setTourStep(2);
      return;
    }
    setTourStep(0);
  }, [params.tourStep, tourActive]);

  useEffect(() => {
    syncUsageWindow();
    setTick(Date.now());
    const interval = setInterval(() => {
      syncUsageWindow();
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [syncUsageWindow]);

  const canSpendPeaches = peachBalance >= PEACHES_PER_MINUTE;
  const hasUsageWindow = usageWindowSeconds > 0;
  const showUnlockedState = hasUsageWindow;
  const needsBlockedApps = hasAppAccess && !selectedAppsConfigured;
  const spendMaxMinutes = Math.max(1, Math.floor(peachBalance / PEACHES_PER_MINUTE));
  const earnMaxMinutes = 60;
  const sliderMaxMinutes = unlockAction === 'spend' ? spendMaxMinutes : earnMaxMinutes;
  const selectedPeaches = selectedMinutes * PEACHES_PER_MINUTE;
  const selectorTitle = unlockAction === 'spend' ? 'Unlock time' : 'Peaches to earn';
  const selectorButtonLabel = unlockAction === 'spend'
    ? `Spend ${selectedPeaches} Peaches`
    : `Do ${Math.ceil(selectedPeaches / PEACHES_PER_SQUAT)} squats`;

  const status = useMemo(() => {
    if (hasUsageWindow) return 'All apps unlocked';
    return 'Locked';
  }, [hasUsageWindow]);
  const holdFillHeight = holdFill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const promptContentStyle = {
    opacity: unlockPromptProgress,
    transform: [
      {
        translateY: unlockPromptProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
  const selectorStyle = {
    opacity: unlockSelectorProgress,
    transform: [
      {
        translateY: unlockSelectorProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
  function finishTour() {
    setTourStep(0);
    router.replace('/(tabs)');
  }

  function showUnlockPrompt(initialAction: UnlockAction | null = null) {
    setUnlockAction(initialAction);
    setSelectedMinutes(
      initialAction === 'earn'
        ? Math.min(10, requestedPeaches / PEACHES_PER_MINUTE)
        : canSpendPeaches
          ? Math.min(10, spendMaxMinutes)
          : Math.min(10, requestedPeaches / PEACHES_PER_MINUTE),
    );
    unlockSelectorProgress.setValue(initialAction ? 1 : 0);
    setUnlockPromptVisible(true);
    router.setParams({ openUnlock: undefined });
    unlockPromptProgress.setValue(0);
    Animated.spring(unlockPromptProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 86,
    }).start();
  }

  function hideUnlockPrompt() {
    setUnlockAction(null);
    unlockSelectorProgress.setValue(0);
    Animated.timing(unlockPromptProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setUnlockPromptVisible(false);
    });
  }

  useEffect(() => {
    if (params.openUnlock !== '1' && params.openUnlock !== 'spend') {
      shieldPromptHandledRef.current = false;
      return;
    }
    if (shieldPromptHandledRef.current || tourActive) return;

    shieldPromptHandledRef.current = true;
    showUnlockPrompt(params.openUnlock === 'spend' ? 'spend' : null);
  }, [params.openUnlock, tourActive]);

  async function openSubscriptionFlow() {
    if (hasAppAccess || subscriptionBusy) return hasAppAccess;
    setSubscriptionBusy(true);
    try {
      const subscribed = await requestSubscriptionAccess();
      if (!subscribed && !subscriptionConfigured) {
        Alert.alert(
          'RevenueCat setup needed',
          subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
      }
      return subscribed;
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function ensureUnlockAccess() {
    if (hasAppAccess) return true;
    return openSubscriptionFlow();
  }

  function chooseUnlockAction(action: UnlockAction) {
    const nextMinutes = action === 'spend'
      ? Math.min(Math.max(1, selectedMinutes), spendMaxMinutes)
      : Math.min(Math.max(1, requestedPeaches / PEACHES_PER_MINUTE), earnMaxMinutes);

    setUnlockAction(action);
    setSelectedMinutes(nextMinutes);
    unlockSelectorProgress.setValue(0);
    void Haptics.selectionAsync().catch(() => {});
    Animated.timing(unlockSelectorProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function updateSelectedMinutes(minutes: number) {
    const nextMinutes = Math.min(sliderMaxMinutes, Math.max(1, Math.round(minutes)));
    if (nextMinutes === selectedMinutes) return;

    setSelectedMinutes(nextMinutes);
    void Haptics.selectionAsync().catch(() => {});
  }

  async function confirmUnlockAction() {
    if (!unlockAction) return;

    const canContinue = await ensureUnlockAccess();
    if (!canContinue) return;

    if (unlockAction === 'earn') {
      setRequestedPeaches(selectedPeaches);
      setUnlockPromptVisible(false);
      setUnlockAction(null);
      unlockSelectorProgress.setValue(0);
      router.push('/session');
      return;
    }

    if (!canSpendPeaches) return;

    setUnlocking(true);
    try {
      const started = await spendPeachesForMinutes(selectedMinutes);
      if (started) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Animated.timing(unlockPromptProgress, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          setUnlockPromptVisible(false);
          setUnlockAction(null);
          unlockSelectorProgress.setValue(0);
        });
      }
    } finally {
      setUnlocking(false);
    }
  }

  function startUnlockHold() {
    if (showUnlockedState || tourActive) return;
    if (!hasAppAccess) {
      void openSubscriptionFlow();
      return;
    }

    holdAnimationRef.current?.stop();
    holdCompleteRef.current = false;
    holdFill.setValue(0);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    holdAnimationRef.current = Animated.timing(holdFill, {
      toValue: 1,
      duration: HOLD_TO_UNLOCK_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    holdAnimationRef.current.start(({ finished }) => {
      if (!finished) return;
      holdCompleteRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showUnlockPrompt();
    });
  }

  function cancelUnlockHold() {
    holdAnimationRef.current?.stop();

    if (holdCompleteRef.current) {
      holdFill.setValue(0);
      holdCompleteRef.current = false;
      return;
    }

    Animated.timing(holdFill, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  function continueTour() {
    if (tourStep === 0) {
      setTourStep(2);
      return;
    }

    if (tourStep >= homeTips.length - 1) {
      finishTour();
      return;
    }
    setTourStep((current) => Math.min(current + 1, homeTips.length - 1));
  }

  if (needsBlockedApps) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose blocked apps"
            onPress={() => router.push('/onboarding/apps')}
            className="items-center justify-center rounded-[40px] bg-raspberry px-8 py-16"
          >
            <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-white/15">
              <AppWindow size={44} stroke={colors.white} strokeWidth={3} />
            </View>
            <Text className="mt-6 text-center text-[34px] font-black leading-[38px] text-white">
              Choose blocked apps
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="BootyBlock"
        logo
        centerLogo
        logoHeight={48}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Level ${bootyProgress.currentLevel.level}, ${bootyProgress.currentLevel.title}, ${bootyProgress.xp} Booty XP`}
        accessibilityHint="Opens statistics"
        onPress={() => router.push('/statistics' as Href)}
        className="-mt-10 rounded-[24px] bg-white px-5 py-4"
        style={({ pressed }) => [styles.xpCard, pressed ? styles.xpCardPressed : null]}
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View className="rounded-full bg-petal px-3 py-1.5">
              <Text className="text-xs font-black text-raspberry">
                Level {bootyProgress.currentLevel.level}
              </Text>
            </View>
            <Text className="min-w-0 flex-1 text-xl font-black text-cocoa" numberOfLines={1} adjustsFontSizeToFit>
              {bootyProgress.currentLevel.title}
            </Text>
          </View>
          <Text className="text-lg font-black tabular-nums text-raspberry">{bootyProgress.xp} XP</Text>
        </View>
        <View style={styles.peachProgressTrack}>
          <View style={[styles.peachProgressFill, { width: bootyProgressPercent }]} />
        </View>
        <Text className="mt-2 text-xs font-bold text-mink" numberOfLines={1}>
          {bootyProgress.nextLevel
            ? `${bootyProgress.xpToNext} XP until ${bootyProgress.nextLevel.title}`
            : 'Max level unlocked'}
        </Text>
      </Pressable>

      <TourHighlight id="balance" activeId={activeSpotlight}>
        <View className={`mt-8 overflow-hidden rounded-[40px] ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}>
          {unlockPromptVisible ? (
            <Animated.View className="p-7" style={promptContentStyle}>
              <View className="rounded-[28px] bg-white/15 p-4">
                <View className="flex-row items-start justify-between gap-4">
                  <View>
                    <Text className="text-xs font-black uppercase tracking-[1.4px] text-white/75">
                      Peaches
                    </Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <PeachIcon size={38} />
                      <Text
                        className="text-4xl font-black tabular-nums text-white"
                        accessibilityLabel={`${peachBalance} Peaches`}
                      >
                        {peachBalance}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close unlock options"
                    className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
                    onPress={hideUnlockPrompt}
                  >
                    <X size={21} stroke={colors.white} strokeWidth={3} />
                  </Pressable>
                </View>
              </View>

              <View className="mt-6">
                {unlockAction ? (
                  <Animated.View style={selectorStyle}>
                    <Text className="text-center text-xs font-black uppercase tracking-[1.3px] text-white/75">
                      {selectorTitle}
                    </Text>
                    <View className="my-3 flex-row items-end justify-center">
                      <NativeRollingNumber
                        value={unlockAction === 'earn' ? selectedPeaches : selectedMinutes}
                        color={colors.white}
                        fontSize={76}
                        fontWeight="900"
                        style={styles.unlockSelectorValue}
                      />
                      <Text className="mb-3 ml-2 text-xl font-black text-white/80">
                        {unlockAction === 'earn' ? 'Peaches' : 'min'}
                      </Text>
                    </View>
                    <Text className="mb-3 text-center text-sm font-bold text-white/75">
                      {unlockAction === 'spend'
                        ? `Costs ${selectedPeaches} Peaches`
                        : `${Math.ceil(selectedPeaches / PEACHES_PER_SQUAT)} squats`}
                    </Text>
                    <Slider
                      accessibilityLabel={selectorTitle}
                      accessibilityValue={unlockAction === 'earn'
                        ? { min: PEACHES_PER_MINUTE, max: earnMaxMinutes * PEACHES_PER_MINUTE, now: selectedPeaches, text: `${selectedPeaches} Peaches` }
                        : { min: 1, max: spendMaxMinutes, now: selectedMinutes, text: `${selectedMinutes} minutes, costs ${selectedPeaches} Peaches` }}
                      minimumValue={unlockAction === 'earn' ? PEACHES_PER_MINUTE : 1}
                      maximumValue={unlockAction === 'earn' ? earnMaxMinutes * PEACHES_PER_MINUTE : spendMaxMinutes}
                      step={unlockAction === 'earn' ? PEACHES_PER_MINUTE : 1}
                      value={unlockAction === 'earn' ? selectedPeaches : selectedMinutes}
                      onValueChange={(value) => updateSelectedMinutes(unlockAction === 'earn' ? value / PEACHES_PER_MINUTE : value)}
                      minimumTrackTintColor={colors.white}
                      maximumTrackTintColor="rgba(255, 255, 255, 0.32)"
                      thumbTintColor={colors.white}
                    />
                    <View className="mt-5 gap-3">
                      <Button
                        label={selectorButtonLabel}
                        icon={unlockAction === 'spend' ? Flame : undefined}
                        size={unlockAction === 'earn' ? 'large' : 'default'}
                        onPress={() => void confirmUnlockAction()}
                        loading={unlocking}
                        disabled={unlockAction === 'spend' && !canSpendPeaches}
                        pressDelayMs={unlockAction === 'earn' ? 0 : undefined}
                      />
                      {unlockAction === 'spend' ? (
                        <Button
                          label="Earn More"
                          size="large"
                          variant="outline"
                          onPress={() => chooseUnlockAction('earn')}
                          pressDelayMs={0}
                        />
                      ) : null}
                    </View>
                  </Animated.View>
                ) : (
                  <View className="gap-3">
                    <Button
                      label="Use Peaches"
                      icon={Flame}
                      disabled={!canSpendPeaches}
                      onPress={() => chooseUnlockAction('spend')}
                    />
                    <Button
                      label="Earn More"
                      size="large"
                      variant="outline"
                      onPress={() => chooseUnlockAction('earn')}
                      pressDelayMs={0}
                    />
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showUnlockedState ? 'All apps unlocked' : 'Hold to unlock'}
              accessibilityHint={showUnlockedState ? undefined : 'Hold until the card fills to choose how to unlock'}
              disabled={showUnlockedState || tourActive}
              onPressIn={startUnlockHold}
              onPressOut={cancelUnlockHold}
              className="p-7"
            >
              {!showUnlockedState ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.holdFill, { height: holdFillHeight }]}
                />
              ) : null}
              {showUnlockedState ? (
                <View className="mb-5 flex-row justify-end">
                  <View className="rounded-full bg-white/45 px-4 py-2">
                    <Text className="text-xs font-black uppercase tracking-[1.2px] text-cocoa">
                      Unlocked window
                    </Text>
                  </View>
                </View>
              ) : null}

              <View className="items-center">
                <View
                  className={`h-20 w-20 items-center justify-center rounded-[28px] ${
                    showUnlockedState ? 'bg-white/60' : 'bg-white/15'
                  }`}
                >
                  {showUnlockedState ? (
                    <Unlock size={38} stroke={colors.cocoa} strokeWidth={3} />
                  ) : (
                    <Lock size={38} stroke={colors.white} strokeWidth={3} />
                  )}
                </View>
                <Text className={`mt-4 text-5xl font-bold ${showUnlockedState ? 'text-cocoa' : 'text-white'}`}>
                  {status}
                </Text>
                {showUnlockedState ? (
                  <Text className="mt-2 text-base font-bold text-mink">Remaining time</Text>
                ) : null}
              </View>

              <View className={`mt-6 rounded-[28px] p-4 ${showUnlockedState ? 'bg-white/55' : 'bg-white/15'}`}>
                <Text className={`text-xs font-black uppercase tracking-[1.4px] ${showUnlockedState ? 'text-mink' : 'text-white/75'}`}>
                  {showUnlockedState ? 'Remaining time' : 'Peaches'}
                </Text>
                {showUnlockedState ? (
                  <Text
                    className="mt-1 text-4xl font-black tabular-nums text-cocoa"
                    accessibilityLabel={remainingTimeAccessibilityLabel(usageWindowSeconds)}
                  >
                    {formatBankDuration(usageWindowSeconds)}
                  </Text>
                ) : (
                  <View className="mt-1 flex-row items-center gap-2">
                    <PeachIcon size={38} />
                    <Text className="text-4xl font-black tabular-nums text-white" accessibilityLabel={`${peachBalance} Peaches`}>
                      {peachBalance}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        </View>
      </TourHighlight>

      {!showUnlockedState && !unlockPromptVisible ? <RoughUnlockPrompt /> : null}

      {!hasAppAccess ? (
        <View className="mt-4">
          <Button
            label="Choose blocked apps"
            icon={Lock}
            loading={subscriptionBusy}
            disabled={subscriptionBusy}
            onPress={() => void openSubscriptionFlow()}
          />
        </View>
      ) : null}

      {tourActive ? (
        <HomeTourOverlay
          step={tourStep}
          onNext={continueTour}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dimOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    backgroundColor: 'rgba(18, 8, 14, 0.76)',
  },
  touchBlocker: {
    ...StyleSheet.absoluteFill,
    zIndex: 25,
  },
  holdFill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  highlightWrap: {
    position: 'relative',
  },
  highlightActive: {
    zIndex: 20,
    shadowColor: colors.raspberry,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 14,
  },
  highlightRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: colors.bubble,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tourCardWrap: {
    bottom: 80,
    left: 0,
    paddingHorizontal: 22,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  tourCard: {
    maxWidth: 360,
    width: '100%',
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 16,
  },
  unlockSelectorValue: {
    height: 82,
    width: 130,
  },
  xpCard: {
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  xpCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  peachProgressTrack: {
    backgroundColor: colors.blush,
    borderRadius: 999,
    height: 7,
    marginTop: 13,
    overflow: 'hidden',
  },
  peachProgressFill: {
    backgroundColor: colors.raspberry,
    borderRadius: 999,
    height: '100%',
  },
  roughUnlockPrompt: {
    alignSelf: 'center',
    height: 78,
    marginTop: 2,
    position: 'relative',
    width: '100%',
  },
  roughUnlockArrow: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: -5,
  },
  roughUnlockText: {
    bottom: 1,
    color: colors.cocoa,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: 0.2,
    position: 'absolute',
    right: 34,
    transform: [{ rotate: '-2deg' }],
  },
});
