import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Flame, Lock, Unlock, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { CelebrationOverlay } from '../../components/CelebrationOverlay';
import { Header } from '../../components/Header';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { PeachIcon } from '../../components/PeachIcon';
import { Screen } from '../../components/Screen';
import { PEACHES_PER_MINUTE, PEACHES_PER_SQUAT } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { getBootyProgress } from '../../lib/progression';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

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
  const params = useLocalSearchParams<{ openUnlock?: '1' | 'spend' }>();
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
  const [unlocking, setUnlocking] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [celebratingSubscription, setCelebratingSubscription] = useState(false);
  const holdFill = useRef(new Animated.Value(0)).current;
  const unlockPromptProgress = useRef(new Animated.Value(0)).current;
  const unlockSelectorProgress = useRef(new Animated.Value(0)).current;
  const blockedAppsEntry = useRef(new Animated.Value(0)).current;
  const blockedAppsGlow = useRef(new Animated.Value(0)).current;
  const holdAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const holdCompleteRef = useRef(false);
  const shieldPromptHandledRef = useRef(false);
  const bootyProgress = useMemo(
    () => getBootyProgress(unlockHistory, currentStreak, bonusXp),
    [unlockHistory, currentStreak, bonusXp],
  );
  const bootyProgressPercent = `${Math.round(bootyProgress.progressRatio * 100)}%` as `${number}%`;

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

  useEffect(() => {
    if (!needsBlockedApps) return;

    blockedAppsEntry.setValue(0);
    blockedAppsGlow.setValue(0);
    const entrance = Animated.spring(blockedAppsEntry, {
      toValue: 1,
      friction: 7,
      tension: 72,
      useNativeDriver: true,
    });
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(blockedAppsGlow, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blockedAppsGlow, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    entrance.start();
    glow.start();

    return () => {
      entrance.stop();
      glow.stop();
    };
  }, [blockedAppsEntry, blockedAppsGlow, needsBlockedApps]);

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
      consumeSubscriptionCelebration();
    }, 1700);

    return () => clearTimeout(timeout);
  }, [consumeSubscriptionCelebration, needsBlockedApps, subscriptionCelebrationPending]);

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
    holdAnimationRef.current?.stop();
    holdAnimationRef.current = null;
    holdCompleteRef.current = false;
    holdFill.setValue(0);
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

  function startUnlockHold() {
    if (showUnlockedState) return;
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

  if (needsBlockedApps) {
    const entryStyle = {
      opacity: blockedAppsEntry,
      transform: [
        {
          translateY: blockedAppsEntry.interpolate({
            inputRange: [0, 1],
            outputRange: [24, 0],
          }),
        },
        {
          scale: blockedAppsEntry.interpolate({
            inputRange: [0, 1],
            outputRange: [0.94, 1],
          }),
        },
      ],
    };
    const glowStyle = {
      opacity: blockedAppsGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.62],
      }),
      transform: [
        {
          scale: blockedAppsGlow.interpolate({
            inputRange: [0, 1],
            outputRange: [1.015, 1.075],
          }),
        },
      ],
    };

    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Animated.View style={entryStyle}>
            <View style={styles.blockedAppsCtaWrap}>
              <Animated.View pointerEvents="none" style={[styles.blockedAppsGlow, glowStyle]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose blocked apps"
                accessibilityHint="Opens the Screen Time app picker"
                onPress={() => router.push('/onboarding/apps')}
                className="items-center justify-center rounded-[40px] bg-raspberry px-8 py-10"
                style={({ pressed }) => pressed ? styles.blockedAppsCtaPressed : null}
              >
                <Text className="text-center text-xs font-black uppercase tracking-[2px] text-white/75">
                  Bootyblock Pro unlocked
                </Text>
                <View style={styles.paywallArtFrame}>
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="contain"
                    source={require('../../assets/paywall-apps.png')}
                    style={styles.paywallArt}
                  />
                </View>
                <Text className="mt-5 text-center text-[34px] font-black leading-[38px] text-white">
                  Choose blocked apps
                </Text>
                <Text className="mt-3 text-center text-base font-bold leading-6 text-white/80">
                  Pick the apps you want Bootyblock to protect.
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
        <CelebrationOverlay visible={celebratingSubscription} showBadge={false} />
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

      <View className={`mt-8 overflow-hidden rounded-[40px] ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}>
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
                      accessibilityLabel="Close unlock options"
                      className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
                      onPress={hideUnlockPrompt}
                    >
                      <X size={21} stroke={colors.white} strokeWidth={3} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close unlock options"
                  className="h-11 w-11 self-end items-center justify-center rounded-full bg-white/15"
                  onPress={hideUnlockPrompt}
                >
                  <X size={21} stroke={colors.white} strokeWidth={3} />
                </Pressable>
              )}

              <View className="mt-6">
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
                        disableGlass
                        onPress={() => void confirmUnlockAction()}
                        loading={unlocking}
                        disabled={unlockAction === 'spend' && !canSpendPeaches}
                        pressDelayMs={unlockAction === 'earn' ? 0 : undefined}
                      />
                    </View>
                  </Animated.View>
                ) : (
                  <View className="gap-3">
                    {canSpendPeaches ? (
                      <Button
                        label="Use Peaches"
                        icon={Flame}
                        size="large"
                        variant="secondary"
                        disableGlass
                        onPress={() => chooseUnlockAction('spend')}
                      />
                    ) : null}
                    <Button
                      label="Earn More"
                      size="large"
                      variant="secondary"
                      disableGlass
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
              disabled={showUnlockedState}
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

    </Screen>
  );
}

const styles = StyleSheet.create({
  blockedAppsCtaWrap: {
    position: 'relative',
  },
  blockedAppsGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bubble,
    borderRadius: 40,
    shadowColor: colors.raspberry,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 14,
  },
  blockedAppsCtaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  paywallArtFrame: {
    alignItems: 'center',
    backgroundColor: '#100911',
    borderRadius: 28,
    height: 150,
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
    width: 220,
  },
  paywallArt: {
    height: 150,
    width: 220,
  },
  holdFill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
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
