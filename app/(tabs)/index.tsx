import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Flame, Lock, Unlock, X } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { CelebrationOverlay } from '../../components/CelebrationOverlay';
import { Header } from '../../components/Header';
import { HomeShowcase, type HomeShowcaseStep } from '../../components/HomeShowcase';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { PeachIcon } from '../../components/PeachIcon';
import { PEACH_PATCH_3D_SUPPORTED, PeachPatch3D } from '../../components/PeachPatch3D';
import { Screen } from '../../components/Screen';
import {
  MAX_SQUAT_SESSION_PEACHES,
  PEACHES_PER_MINUTE,
  PEACHES_PER_SQUAT,
} from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { trackOnboardingStepViewed } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { getPeachPatchStage } from '../../lib/peachPatch';
import { getBootyProgress } from '../../lib/progression';
import { countSquatActivityDays, GLUTE_JOURNEY_DAYS } from '../../lib/squatActivity';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const LOCKED_HOME_GRADIENT = ['#FFF1F6', '#FFF9F3', '#FFD6E7'] as const;
const UNLOCKED_HOME_GRADIENT = ['#DDFBE7', '#F4FFF1', '#A8EFC2'] as const;
const JOURNEY_CARD_FALLBACK_HEIGHT = 415;

type UnlockAction = 'spend' | 'earn';

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

export default function Home() {
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{
    onboardingArrival?: '1';
    openUnlock?: '1' | 'spend';
  }>();
  const previewParams = useGlobalSearchParams<{ postPurchasePreview?: '1' }>();
  const posthog = usePostHog();
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
    subscriptionCelebrationPending,
    consumeSubscriptionCelebration,
    requestSubscriptionAccess,
    subscriptionConfigured,
    subscriptionError,
  } = useBootyblock();
  const [, setTick] = useState(Date.now);
  const [unlockPromptVisible, setUnlockPromptVisible] = useState(false);
  const [unlockAction, setUnlockAction] = useState<UnlockAction | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(1);
  const [quickSquatSelectorVisible, setQuickSquatSelectorVisible] = useState(false);
  const [quickSquats, setQuickSquats] = useState(() => Math.max(
    1,
    Math.min(
      Math.floor(MAX_SQUAT_SESSION_PEACHES / PEACHES_PER_SQUAT),
      Math.ceil(requestedPeaches / PEACHES_PER_SQUAT),
    ),
  ));
  const [unlocking, setUnlocking] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [celebratingSubscription, setCelebratingSubscription] = useState(false);
  const [showcaseStep, setShowcaseStep] = useState<HomeShowcaseStep | null>(null);
  const [journeyCardWidth, setJourneyCardWidth] = useState(() => Math.max(0, windowWidth - 48));
  const [journeyCardPage, setJourneyCardPage] = useState(0);
  const unlockPromptProgress = useRef(new Animated.Value(0)).current;
  const unlockSelectorProgress = useRef(new Animated.Value(0)).current;
  const journeyShowcaseTargetRef = useRef<View>(null);
  const patchShowcaseTargetRef = useRef<View>(null);
  const blockingShowcaseTargetRef = useRef<View>(null);
  const journeyPagerRef = useRef<ScrollView>(null);
  const postPurchasePreviewHandledRef = useRef(false);
  const shieldPromptHandledRef = useRef(false);
  const journeyCardPageRef = useRef(0);
  const bootyProgress = useMemo(
    () => getBootyProgress(unlockHistory, currentStreak, bonusXp),
    [unlockHistory, currentStreak, bonusXp],
  );
  const bootyProgressPercent = `${Math.round(bootyProgress.progressRatio * 100)}%` as `${number}%`;
  const completedJourneyDays = useMemo(
    () => countSquatActivityDays(unlockHistory),
    [unlockHistory],
  );
  const journeyProgressPercent = Math.round((completedJourneyDays / GLUTE_JOURNEY_DAYS) * 100);
  const streakLabel = `${currentStreak} day${currentStreak === 1 ? '' : 's'} streak`;
  const patchStage = useMemo(() => getPeachPatchStage(completedJourneyDays), [completedJourneyDays]);
  const journeyCardDisplayHeight = journeyCardWidth > 0
    ? Math.round(journeyCardWidth * (JOURNEY_CARD_FALLBACK_HEIGHT / 341))
    : JOURNEY_CARD_FALLBACK_HEIGHT;

  useEffect(() => {
    if (params.onboardingArrival !== '1') return;

    trackOnboardingStepViewed(
      posthog,
      '/home',
      ONBOARDING_STEPS.homeScreen.key,
      ONBOARDING_STEPS.homeScreen.title,
      ONBOARDING_STEPS.homeScreen.index,
      ONBOARDING_STEP_TOTAL,
    );
  }, [params.onboardingArrival, posthog]);

  useEffect(() => {
    if (
      previewParams.postPurchasePreview !== '1'
      ||
      journeyCardWidth <= 0
      || postPurchasePreviewHandledRef.current
    ) return;

    postPurchasePreviewHandledRef.current = true;
    const firstStep: HomeShowcaseStep = PEACH_PATCH_3D_SUPPORTED ? 'patch' : 'journey';
    const page = firstStep === 'patch' ? 1 : 0;
    journeyPagerRef.current?.scrollTo({ animated: false, x: page * journeyCardWidth, y: 0 });
    journeyCardPageRef.current = page;
    setJourneyCardPage(page);
    setShowcaseStep(firstStep);
  }, [journeyCardWidth, previewParams.postPurchasePreview]);

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
  const earnMaxMinutes = MAX_SQUAT_SESSION_PEACHES / PEACHES_PER_MINUTE;
  const quickSquatMax = Math.floor(MAX_SQUAT_SESSION_PEACHES / PEACHES_PER_SQUAT);
  const sliderMaxMinutes = unlockAction === 'spend' ? spendMaxMinutes : earnMaxMinutes;
  const selectedPeaches = selectedMinutes * PEACHES_PER_MINUTE;
  const selectorTitle = unlockAction === 'spend' ? 'Unlock time' : 'Peaches to earn';
  const selectorButtonLabel = unlockAction === 'spend'
    ? `Spend ${selectedPeaches} Peaches`
    : `Do ${Math.ceil(selectedPeaches / PEACHES_PER_SQUAT)} squats`;

  useEffect(() => {
    if (!subscriptionCelebrationPending) return;
    if (!needsBlockedApps) {
      consumeSubscriptionCelebration();
      return;
    }

    setCelebratingSubscription(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timeout = setTimeout(() => {
      setCelebratingSubscription(false);
      const firstStep: HomeShowcaseStep = PEACH_PATCH_3D_SUPPORTED ? 'patch' : 'journey';
      if (firstStep === 'patch' && journeyCardWidth > 0) {
        journeyPagerRef.current?.scrollTo({ animated: false, x: journeyCardWidth, y: 0 });
        journeyCardPageRef.current = 1;
        setJourneyCardPage(1);
      }
      setShowcaseStep(firstStep);
      consumeSubscriptionCelebration();
    }, 1700);

    return () => clearTimeout(timeout);
  }, [consumeSubscriptionCelebration, journeyCardWidth, needsBlockedApps, subscriptionCelebrationPending]);

  const status = useMemo(() => {
    if (hasUsageWindow) return 'All apps unlocked';
    return 'quick squat 💪';
  }, [hasUsageWindow]);
  const promptContentStyle = {
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
    transform: [
      {
        translateY: unlockSelectorProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
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

  function returnToUnlockActions() {
    setUnlockAction(null);
    unlockSelectorProgress.setValue(0);
  }

  useEffect(() => {
    if (params.openUnlock !== '1' && params.openUnlock !== 'spend') {
      shieldPromptHandledRef.current = false;
      return;
    }
    if (shieldPromptHandledRef.current) return;

    shieldPromptHandledRef.current = true;
    showUnlockPrompt(params.openUnlock === 'spend' ? 'spend' : null);
  }, [params.openUnlock]);

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

  function showQuickSquatSelector() {
    setQuickSquats(Math.max(
      1,
      Math.min(quickSquatMax, Math.ceil(requestedPeaches / PEACHES_PER_SQUAT)),
    ));
    setQuickSquatSelectorVisible(true);
    void Haptics.selectionAsync().catch(() => {});
  }

  function updateQuickSquats(value: number) {
    const nextSquats = Math.max(1, Math.min(quickSquatMax, Math.round(value)));
    if (nextSquats === quickSquats) return;

    setQuickSquats(nextSquats);
    void Haptics.selectionAsync().catch(() => {});
  }

  async function startQuickSquat() {
    if (showUnlockedState) return;
    const canContinue = await ensureUnlockAccess();
    if (!canContinue) return;

    setRequestedPeaches(quickSquats * PEACHES_PER_SQUAT);
    setQuickSquatSelectorVisible(false);
    void Haptics.selectionAsync().catch(() => {});
    router.push('/session');
  }

  function handleJourneyCardSwipe(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (journeyCardWidth <= 0) return;
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / journeyCardWidth);
    if (nextPage === journeyCardPageRef.current) return;

    journeyCardPageRef.current = nextPage;
    setJourneyCardPage(nextPage);
    void Haptics.selectionAsync().catch(() => {});
  }

  function advanceShowcase(step: HomeShowcaseStep) {
    if (step === 'patch') {
      journeyPagerRef.current?.scrollTo({ animated: true, x: 0, y: 0 });
      journeyCardPageRef.current = 0;
      setJourneyCardPage(0);
      setShowcaseStep('journey');
      return;
    }

    setShowcaseStep('blocking');
  }

  function chooseAppsFromShowcase() {
    setShowcaseStep(null);
    router.push({ pathname: '/onboarding/apps', params: { continueShowcase: '1' } });
  }

  return (
    <Screen
      backgroundColor={showUnlockedState ? '#DDFBE7' : '#FFF1F6'}
      backgroundGradient={showUnlockedState ? UNLOCKED_HOME_GRADIENT : LOCKED_HOME_GRADIENT}
    >
      <Header
        title="bootyblock"
        logo
        centerLogo
        logoHeight={48}
        rightAccessory={(
          <View
            accessible
            accessibilityLabel={`${peachBalance} Peaches`}
            className="h-11 flex-row items-center gap-1.5 rounded-full bg-white/75 px-3"
          >
            <PeachIcon size={25} />
            <Text className="text-base font-black tabular-nums text-cocoa">{peachBalance}</Text>
          </View>
        )}
      />

      <View
        className="-mt-10"
        onLayout={(event) => setJourneyCardWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={journeyPagerRef}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          onMomentumScrollEnd={handleJourneyCardSwipe}
          onScroll={handleJourneyCardSwipe}
          onScrollEndDrag={handleJourneyCardSwipe}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.journeyPager}
        >
          <View
            style={{
              height: journeyCardDisplayHeight,
              width: journeyCardWidth,
            }}
          >
            <Pressable
              ref={journeyShowcaseTargetRef}
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`Level ${bootyProgress.currentLevel.level}, ${bootyProgress.currentLevel.title}, ${bootyProgress.xp} Booty XP, ${streakLabel}, ${completedJourneyDays} of ${GLUTE_JOURNEY_DAYS} journey days complete`}
              accessibilityHint="Opens full activity with month and year views"
              onPress={() => router.push('/statistics' as Href)}
              style={[styles.xpCard, styles.journeyPagerCard]}
            >
              <LinearGradient
                colors={['#FFE8F1', '#FFF1F5', '#FFC4DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.journeyCard}
              >
                <View className="flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2.5">
                      <View className="rounded-full bg-white/75 px-3 py-1.5">
                        <Text className="text-xs font-black text-raspberry">
                          Level {bootyProgress.currentLevel.level}
                        </Text>
                      </View>
                      <Text className="min-w-0 flex-1 text-xl font-black text-cocoa" numberOfLines={1} adjustsFontSizeToFit>
                        {bootyProgress.currentLevel.title}
                      </Text>
                    </View>
                    <Text className="mt-1.5 text-xs font-bold text-mink">
                      {journeyProgressPercent}% of your 90 day glute journey
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-black tabular-nums text-raspberry">{bootyProgress.xp} XP</Text>
                    <Text className="mt-0.5 text-xs font-black text-cocoa">🔥 {streakLabel}</Text>
                  </View>
                </View>

                <View style={styles.journeyGrid}>
                  {Array.from({ length: 9 }, (_, row) => (
                    <View key={row} style={styles.journeyRow}>
                      {Array.from({ length: 10 }, (_, column) => {
                        const dayIndex = row * 10 + column;
                        const complete = dayIndex < completedJourneyDays;

                        return (
                          <View
                            key={column}
                            style={[styles.journeyCell, complete && styles.journeyCellComplete]}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>

                <View style={styles.peachProgressTrack}>
                  <View style={[styles.peachProgressFill, { width: bootyProgressPercent }]} />
                </View>
                <Text className="mt-2 text-xs font-bold text-mink" numberOfLines={1}>
                  {bootyProgress.nextLevel
                    ? `${bootyProgress.xpToNext} XP until ${bootyProgress.nextLevel.title}`
                    : 'Max level unlocked'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {PEACH_PATCH_3D_SUPPORTED ? (
            <View style={{ height: journeyCardDisplayHeight, width: journeyCardWidth }}>
              <Pressable
                ref={patchShowcaseTargetRef}
                collapsable={false}
                accessibilityRole="button"
                accessibilityLabel={`Open ${patchStage.title}, day ${completedJourneyDays} of your Peach Patch`}
                accessibilityHint="Opens the full-screen interactive Peach Patch"
                onPress={() => router.push('/journey' as Href)}
                style={[styles.xpCard, styles.journeyPagerCard]}
              >
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <PeachPatch3D active={journeyCardPage === 1} completedDays={completedJourneyDays} interactive={false} />
                </View>
                <LinearGradient
                  colors={['rgba(28,70,102,0.10)', 'rgba(22,55,82,0.72)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View className="flex-1 justify-end p-5">
                  <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-white/75">
                    day {completedJourneyDays} · {patchStage.title}
                  </Text>
                  <Text className="mt-1 text-2xl font-black text-white">your peach patch</Text>
                  <Text className="mt-1 text-xs font-bold text-white/75">
                    {patchStage.farmers} farmers · {patchStage.peachTrees} peach trees
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {PEACH_PATCH_3D_SUPPORTED ? (
          <View accessibilityRole="tablist" className="mt-2 flex-row justify-center gap-1.5">
            {[0, 1].map((page) => (
              <View
                key={page}
                accessibilityRole="tab"
                accessibilityState={{ selected: journeyCardPage === page }}
                className={`h-1.5 rounded-full ${journeyCardPage === page ? 'w-5 bg-raspberry' : 'w-1.5 bg-raspberry/25'}`}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View
        ref={blockingShowcaseTargetRef}
        collapsable={false}
        className={`mt-8 overflow-hidden rounded-[40px] ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}
      >
          {unlockPromptVisible ? (
            <Animated.View className="p-7" style={promptContentStyle}>
              {unlockAction !== 'earn' ? (
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
                      accessibilityLabel={unlockAction ? 'Back to unlock options' : 'Close unlock options'}
                      className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
                      onPress={unlockAction ? returnToUnlockActions : hideUnlockPrompt}
                    >
                      {unlockAction ? (
                        <ChevronLeft size={24} stroke={colors.white} strokeWidth={3} />
                      ) : (
                        <X size={21} stroke={colors.white} strokeWidth={3} />
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to unlock options"
                  className="h-11 w-11 self-end items-center justify-center rounded-full bg-white/15"
                  onPress={returnToUnlockActions}
                >
                  <ChevronLeft size={24} stroke={colors.white} strokeWidth={3} />
                </Pressable>
              )}

              <View className={unlockAction === 'earn' ? 'mt-0' : 'mt-6'}>
                {unlockAction ? (
                  <Animated.View style={selectorStyle}>
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
                    {unlockAction === 'spend' ? (
                      <Text className="mb-3 text-center text-sm font-bold text-white/75">
                        {`Costs ${selectedPeaches} Peaches`}
                      </Text>
                    ) : null}
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
                        size="large"
                        variant="secondary"
                        onPress={() => void confirmUnlockAction()}
                        loading={unlocking}
                        disabled={unlockAction === 'spend' && !canSpendPeaches}
                        pressDelayMs={unlockAction === 'earn' ? 0 : undefined}
                      />
                    </View>
                  </Animated.View>
                ) : (
                  <View className="gap-3">
                    <Button
                      label="Earn More"
                      size="large"
                      variant="secondary"
                      onPress={() => chooseUnlockAction('earn')}
                      pressDelayMs={0}
                    />
                  </View>
                )}
              </View>
            </Animated.View>
          ) : showUnlockedState ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="All apps unlocked"
              disabled
              className="px-7 py-6"
            >
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-white/60">
                  <Unlock size={38} stroke={colors.cocoa} strokeWidth={3} />
                </View>
                <Text
                  className="mt-3 text-[40px] font-bold leading-[44px] text-cocoa"
                  style={styles.homeStatusText}
                >
                  {status}
                </Text>
              </View>

              <View className="mt-5 rounded-[28px] bg-white/55 p-4">
                <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">
                  Remaining time
                </Text>
                <View
                  accessible
                  accessibilityLabel={remainingTimeAccessibilityLabel(usageWindowSeconds)}
                  style={styles.homeCountdown}
                >
                  <NativeRollingNumber
                    value={formatBankDuration(usageWindowSeconds)}
                    color={colors.cocoa}
                    countsDown
                    fontSize={36}
                    fontWeight="900"
                    style={styles.homeCountdownNumber}
                  />
                </View>
              </View>
            </Pressable>
          ) : quickSquatSelectorVisible ? (
            <View className="px-5 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-2xl font-black tabular-nums text-white"
                >
                  {quickSquats} squats
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close squat selector"
                  className="h-9 w-9 items-center justify-center rounded-full bg-white/15"
                  onPress={() => setQuickSquatSelectorVisible(false)}
                >
                  <X size={18} stroke={colors.white} strokeWidth={3} />
                </Pressable>
              </View>
              <Slider
                accessibilityLabel="Number of squats"
                accessibilityValue={{ min: 1, max: quickSquatMax, now: quickSquats, text: `${quickSquats} squats` }}
                minimumValue={1}
                maximumValue={quickSquatMax}
                step={1}
                value={quickSquats}
                onValueChange={updateQuickSquats}
                minimumTrackTintColor={colors.white}
                maximumTrackTintColor="rgba(255, 255, 255, 0.32)"
                thumbTintColor={colors.white}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Start ${quickSquats} squats to earn ${quickSquats * PEACHES_PER_SQUAT} Peaches`}
                className="mt-2 h-11 items-center justify-center rounded-full bg-white"
                onPress={() => void startQuickSquat()}
              >
                <Text className="text-base font-black text-raspberry">start squatting</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quick Squat"
              accessibilityHint="Opens a slider to choose how many squats to do"
              onPress={showQuickSquatSelector}
              className="px-7 py-5"
            >
              <Text
                className="text-[34px] font-bold leading-[40px] text-white"
                style={styles.homeStatusText}
              >
                {status}
              </Text>
            </Pressable>
          )}
      </View>

      {!hasAppAccess || needsBlockedApps ? (
        <View className="mt-4">
          <Button
            label="Choose blocked apps"
            icon={Lock}
            loading={subscriptionBusy}
            disabled={subscriptionBusy}
            onPress={() => {
              if (needsBlockedApps) {
                router.push('/onboarding/apps');
                return;
              }
              void openSubscriptionFlow();
            }}
          />
        </View>
      ) : null}

      <CelebrationOverlay visible={celebratingSubscription} showBadge={false} />
      <HomeShowcase
        step={showcaseStep}
        targetRef={showcaseStep === 'patch'
          ? patchShowcaseTargetRef
          : showcaseStep === 'blocking'
            ? blockingShowcaseTargetRef
            : journeyShowcaseTargetRef}
        onAdvance={advanceShowcase}
        onChooseApps={chooseAppsFromShowcase}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  unlockSelectorValue: {
    height: 82,
    width: 130,
  },
  homeStatusText: {
    maxWidth: '100%',
    textAlign: 'center',
  },
  homeCountdown: {
    alignItems: 'flex-start',
    height: 48,
    justifyContent: 'center',
    marginTop: 2,
  },
  homeCountdownNumber: {
    height: 48,
    width: 190,
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
  journeyCard: {
    paddingBottom: 15,
    paddingHorizontal: 17,
    paddingTop: 16,
  },
  journeyPager: {
    overflow: 'hidden',
    width: '100%',
  },
  journeyPagerCard: {
    borderRadius: 24,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  journeyGrid: {
    gap: 4,
    marginTop: 14,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  journeyCell: {
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(233, 30, 115, 0.18)',
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
  },
  journeyCellComplete: {
    backgroundColor: colors.raspberry,
    borderColor: colors.raspberry,
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
});
