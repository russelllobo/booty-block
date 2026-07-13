import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { AppWindow, Dumbbell, Flame, Lock, Trophy, Unlock, X } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text as NativeText,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { getPeachProgress } from '../../lib/progression';
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
      <Svg height="66" style={styles.roughUnlockArrow} viewBox="0 0 300 66" width="100%">
        <Path
          d="M 211 58 C 226 39, 211 16, 164 12"
          fill="none"
          opacity={0.22}
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeWidth={5.5}
        />
        <Path
          d="M 213 58 C 226 38, 209 15, 164 11"
          fill="none"
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeWidth={3.2}
        />
        <Path
          d="M 164 11 C 174 13, 181 12, 189 8 M 164 11 C 171 19, 174 25, 175 32"
          fill="none"
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.2}
        />
      </Svg>
      <NativeText style={styles.roughUnlockText}>hold to unlock</NativeText>
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
    title: 'Earn minutes with squats',
    body: 'Start a quick squat session whenever you want more scrolling time back.',
  },
  {
    id: 'streak',
    eyebrow: 'Momentum',
    title: 'Build your streak',
    body: 'Every day you earn minutes keeps your progress visible at the top of Home.',
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

function remainingTimeAccessibilityLabel(totalSeconds: number, context: 'bank' | 'window') {
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

  return `${parts.join(', ')} remaining ${context === 'window' ? 'in current unlock window' : 'in bank'}`;
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ appTour?: string; openUnlock?: string; tourStep?: string }>();
  const {
    timeBankSeconds,
    usageWindowSeconds,
    requestedMinutes,
    setRequestedMinutes,
    useBankedTime,
    currentStreak,
    unlockHistory,
    syncTimeBank,
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
  const peachProgress = useMemo(
    () => getPeachProgress(unlockHistory, currentStreak),
    [unlockHistory, currentStreak],
  );
  const peachProgressPercent = `${Math.round(peachProgress.progressRatio * 100)}%` as `${number}%`;

  useEffect(() => {
    if (!tourActive) return;
    if (params.tourStep === 'streak') {
      setTourStep(2);
      return;
    }
    setTourStep(0);
  }, [params.tourStep, tourActive]);

  useEffect(() => {
    syncTimeBank();
    setTick(Date.now());
    const interval = setInterval(() => {
      syncTimeBank();
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [syncTimeBank]);

  useEffect(() => {
    return () => {
      router.setParams({ hideTabs: undefined });
    };
  }, []);

  const hasBank = timeBankSeconds > 0;
  const hasUsageWindow = usageWindowSeconds > 0;
  const showUnlockedState = hasUsageWindow;
  const showEmptyBank = !hasBank && !hasUsageWindow;
  const needsBlockedApps = hasAppAccess && !selectedAppsConfigured;
  const bankMinutes = Math.ceil(timeBankSeconds / 60);
  const spendMaxMinutes = Math.max(1, bankMinutes);
  const earnMaxMinutes = 60;
  const sliderMaxMinutes = unlockAction === 'spend' ? spendMaxMinutes : earnMaxMinutes;
  const selectorTitle = unlockAction === 'spend' ? 'Use banked minutes' : 'Earn more minutes';
  const selectorButtonLabel = unlockAction === 'spend'
    ? `Use ${selectedMinutes} min`
    : `Start ${selectedMinutes * MINUTES_TO_SQUATS} squats`;

  const status = useMemo(() => {
    if (hasUsageWindow) return 'All apps unlocked';
    return 'Locked';
  }, [hasUsageWindow]);
  const holdFillHeight = holdFill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const promptBackdropScale = unlockPromptProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 1],
  });
  const promptBloomSize = Math.ceil(Math.hypot(windowWidth, windowHeight)) + 160;
  const promptContentStyle = {
    opacity: unlockPromptProgress,
    transform: [
      {
        translateY: unlockPromptProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: unlockPromptProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
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
  const promptBankStyle = unlockAction
    ? {
        opacity: unlockSelectorProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
        transform: [
          {
            translateY: unlockSelectorProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -18],
            }),
          },
          {
            scale: unlockSelectorProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.96],
            }),
          },
        ],
      }
    : null;

  function finishTour() {
    setTourStep(0);
    router.replace('/(tabs)');
  }

  function showUnlockPrompt(initialAction: UnlockAction | null = null) {
    setUnlockAction(initialAction);
    setSelectedMinutes(
      initialAction === 'earn'
        ? Math.min(10, requestedMinutes)
        : hasBank
          ? Math.min(10, spendMaxMinutes)
          : Math.min(10, requestedMinutes),
    );
    unlockSelectorProgress.setValue(initialAction ? 1 : 0);
    setUnlockPromptVisible(true);
    router.setParams({ hideTabs: '1', openUnlock: undefined });
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
    router.setParams({ hideTabs: undefined });
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
    if (params.openUnlock !== '1') {
      shieldPromptHandledRef.current = false;
      return;
    }
    if (shieldPromptHandledRef.current || tourActive) return;

    shieldPromptHandledRef.current = true;
    showUnlockPrompt();
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
      : Math.min(Math.max(1, requestedMinutes), earnMaxMinutes);

    setUnlockAction(action);
    setSelectedMinutes(nextMinutes);
    unlockSelectorProgress.setValue(0);
    void Haptics.selectionAsync().catch(() => {});
    if (action === 'earn') {
      unlockSelectorProgress.setValue(1);
      return;
    }

    Animated.timing(unlockSelectorProgress, {
      toValue: 1,
      duration: 240,
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
      setRequestedMinutes(selectedMinutes);
      setUnlockPromptVisible(false);
      setUnlockAction(null);
      unlockSelectorProgress.setValue(0);
      router.setParams({ hideTabs: undefined });
      router.push('/session');
      return;
    }

    if (!hasBank) return;

    setUnlocking(true);
    try {
      const started = await useBankedTime(selectedMinutes);
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
          router.setParams({ hideTabs: undefined });
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
        accessibilityLabel={`Level ${peachProgress.currentLevel.level}, ${peachProgress.currentLevel.title}, ${peachProgress.xp} Peach XP`}
        accessibilityHint="Opens statistics"
        onPress={() => router.push('/statistics' as Href)}
        className="-mt-10 rounded-[28px] bg-white/75 p-4"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-petal">
            <Trophy size={24} stroke={colors.raspberry} strokeWidth={3} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">
              Level {peachProgress.currentLevel.level}
            </Text>
            <Text className="mt-0.5 text-xl font-black text-cocoa" numberOfLines={1} adjustsFontSizeToFit>
              {peachProgress.currentLevel.title}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[11px] font-black uppercase tracking-[1.2px] text-mink">Peach XP</Text>
            <Text className="mt-0.5 text-lg font-black text-raspberry">{peachProgress.xp}</Text>
          </View>
        </View>
        <View style={styles.peachProgressTrack}>
          <View style={[styles.peachProgressFill, { width: peachProgressPercent }]} />
        </View>
        <Text className="mt-2 text-xs font-bold text-mink">
          {peachProgress.nextLevel
            ? `${peachProgress.xpToNext} XP to ${peachProgress.nextLevel.title}`
            : 'Max level unlocked'}
        </Text>
      </Pressable>

      <TourHighlight id="balance" activeId={activeSpotlight}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showUnlockedState ? 'All apps unlocked' : 'Hold to unlock'}
          accessibilityHint={showUnlockedState ? undefined : 'Hold until the card fills to choose how to unlock'}
          disabled={showUnlockedState || tourActive}
          onPressIn={startUnlockHold}
          onPressOut={cancelUnlockHold}
          className={`mt-8 overflow-hidden rounded-[40px] p-7 ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}
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

          {showUnlockedState ? (
            <View className="mt-6 rounded-[28px] bg-white/55 p-4">
              <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">
                {hasUsageWindow ? 'Remaining time' : 'Banked time'}
              </Text>
              <Text
                className="mt-1 text-4xl font-black tabular-nums text-cocoa"
                accessibilityLabel={remainingTimeAccessibilityLabel(
                  hasUsageWindow ? usageWindowSeconds : timeBankSeconds,
                  hasUsageWindow ? 'window' : 'bank',
                )}
              >
                {formatBankDuration(hasUsageWindow ? usageWindowSeconds : timeBankSeconds)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </TourHighlight>

      {!showUnlockedState ? <RoughUnlockPrompt /> : null}

      {hasBank && !showUnlockedState && !tourActive ? (
        <View className="mt-4">
          <Button
            label="Use minutes"
            icon={Flame}
            onPress={() => showUnlockPrompt('spend')}
          />
        </View>
      ) : null}

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

      <Modal
        animationType="none"
        onRequestClose={hideUnlockPrompt}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={unlockPromptVisible}
      >
        <View style={[styles.unlockPromptWrap, showEmptyBank ? styles.emptyBankPromptWrap : null]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.unlockPromptBloom,
              showEmptyBank ? styles.emptyBankPromptBloom : null,
              {
                borderRadius: promptBloomSize / 2,
                height: promptBloomSize,
                transform: [{ scale: promptBackdropScale }],
                width: promptBloomSize,
              },
            ]}
          />
          <Animated.View style={[styles.unlockPromptContent, promptContentStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close unlock options"
              onPress={hideUnlockPrompt}
              style={styles.unlockPromptClose}
            >
              <X size={22} stroke={colors.white} strokeWidth={3} />
            </Pressable>

            <View style={styles.unlockPromptStage}>
              {unlockAction ? (
                <Animated.View pointerEvents="none" style={[styles.unlockPromptBankExit, promptBankStyle]}>
                  <Text
                    className={`text-center text-xs font-black uppercase tracking-[1.5px] ${
                      showEmptyBank ? 'text-petal' : 'text-white/75'
                    }`}
                  >
                    {showEmptyBank ? 'Bank empty' : 'Bank'}
                  </Text>
                  <View className="mt-2 flex-row items-end justify-center">
                    <Text
                      className={`text-[118px] font-black leading-[122px] ${
                        showEmptyBank ? 'text-petal' : 'text-white'
                      }`}
                    >
                      {bankMinutes}
                    </Text>
                    <Text
                      className={`mb-5 ml-2 text-3xl font-black ${
                        showEmptyBank ? 'text-petal/80' : 'text-white/80'
                      }`}
                    >
                      min
                    </Text>
                  </View>
                </Animated.View>
              ) : (
                <>
                  <Text
                    className={`text-center text-xs font-black uppercase tracking-[1.5px] ${
                      showEmptyBank ? 'text-petal' : 'text-white/75'
                    }`}
                  >
                    {showEmptyBank ? 'Bank empty' : 'Bank'}
                  </Text>
                  <View className="mt-2 flex-row items-end justify-center">
                    <Text
                      className={`text-[118px] font-black leading-[122px] ${
                        showEmptyBank ? 'text-petal' : 'text-white'
                      }`}
                    >
                      {bankMinutes}
                    </Text>
                    <Text
                      className={`mb-5 ml-2 text-3xl font-black ${
                        showEmptyBank ? 'text-petal/80' : 'text-white/80'
                      }`}
                    >
                      min
                    </Text>
                  </View>
                </>
              )}

              {unlockAction ? (
                <Animated.View style={selectorStyle}>
                  <Text className="text-center text-xs font-black uppercase tracking-[1.3px] text-white/75">
                    {selectorTitle}
                  </Text>
                  <View className="my-3 flex-row items-end justify-center">
                    <Text className="text-[92px] font-black leading-[98px] text-white">
                      {selectedMinutes}
                    </Text>
                    <Text className="mb-4 ml-2 text-2xl font-black text-white/80">
                      min
                    </Text>
                  </View>
                  <Slider
                    accessibilityLabel={selectorTitle}
                    accessibilityValue={{ min: 1, max: sliderMaxMinutes, now: selectedMinutes, text: `${selectedMinutes} minutes` }}
                    minimumValue={1}
                    maximumValue={sliderMaxMinutes}
                    step={1}
                    value={selectedMinutes}
                    onValueChange={updateSelectedMinutes}
                    minimumTrackTintColor={colors.white}
                    maximumTrackTintColor="rgba(255, 255, 255, 0.32)"
                    thumbTintColor={colors.white}
                  />
                  <View className="mt-5">
                    <Button
                      label={selectorButtonLabel}
                      icon={unlockAction === 'spend' ? Flame : Dumbbell}
                      onPress={() => void confirmUnlockAction()}
                      loading={unlocking}
                      disabled={unlockAction === 'spend' && !hasBank}
                      pressDelayMs={unlockAction === 'earn' ? 0 : undefined}
                    />
                  </View>
                </Animated.View>
              ) : (
                <View className="gap-3">
                  {hasBank ? (
                    <Button
                      label="Use banked minutes"
                      icon={Flame}
                      onPress={() => chooseUnlockAction('spend')}
                    />
                  ) : null}
                  <Button
                    label="Earn more minutes"
                    icon={Dumbbell}
                    variant={hasBank ? 'secondary' : 'primary'}
                    noOutline={hasBank}
                    onPress={() => chooseUnlockAction('earn')}
                    pressDelayMs={0}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  unlockPromptWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(208, 27, 101, 0.96)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 40,
  },
  emptyBankPromptWrap: {
    backgroundColor: colors.cocoa,
  },
  unlockPromptBloom: {
    backgroundColor: colors.raspberry,
    position: 'absolute',
  },
  emptyBankPromptBloom: {
    backgroundColor: colors.cherry,
  },
  unlockPromptContent: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  unlockPromptStage: {
    alignSelf: 'center',
    minHeight: 292,
    width: '100%',
    maxWidth: 320,
  },
  unlockPromptBankExit: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  unlockPromptClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 58,
    width: 44,
  },
  peachProgressTrack: {
    backgroundColor: colors.petal,
    borderRadius: 999,
    height: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  peachProgressFill: {
    backgroundColor: colors.raspberry,
    borderRadius: 999,
    height: '100%',
  },
  roughUnlockPrompt: {
    alignSelf: 'center',
    height: 70,
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
    fontFamily: Platform.select({
      ios: 'SF Pro Rounded',
      android: 'sans-serif',
      web: 'SF Pro Rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: 0.2,
    position: 'absolute',
    right: 34,
    transform: [{ rotate: '-2deg' }],
  },
});
