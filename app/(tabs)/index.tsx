import { router, useLocalSearchParams } from 'expo-router';
import { Dumbbell, Flame, Lock, LockKeyhole, LucideIcon, Sparkles, Unlock } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type SpotlightKey = 'balance' | 'earn' | 'streak';

type HomeTip = {
  id: SpotlightKey;
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const homeTips: HomeTip[] = [
  {
    id: 'balance',
    eyebrow: 'Home base',
    title: 'Your lock status lives here',
    body: 'See whether your distracting apps are locked, how many are protected, and what is ready to use.',
    icon: Lock,
  },
  {
    id: 'earn',
    eyebrow: 'Move first',
    title: 'Earn minutes with squats',
    body: 'Start a quick squat session whenever you want more scrolling time back.',
    icon: Dumbbell,
  },
  {
    id: 'streak',
    eyebrow: 'Momentum',
    title: 'Build your streak',
    body: 'Every day you earn minutes keeps your progress visible at the top of Home.',
    icon: Flame,
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

function TourDots({ activeIndex }: { activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {homeTips.map((tip, index) => (
        <View
          key={tip.id}
          className="h-2.5 rounded-full"
          style={{
            width: index === activeIndex ? 24 : 10,
            backgroundColor: index === activeIndex ? colors.raspberry : `${colors.raspberry}33`,
          }}
        />
      ))}
    </View>
  );
}

function HomeTourOverlay({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const tip = homeTips[step];
  const TipIcon = tip.icon;
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
          className="rounded-[30px] border border-white/80 bg-white px-5 py-5"
          style={styles.tourCard}
        >
          <View className="flex-row items-start gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
              <TipIcon size={22} stroke={colors.raspberry} strokeWidth={2.7} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-black uppercase tracking-wide text-mink">{tip.eyebrow}</Text>
              <Text className="mt-1 text-[22px] font-black leading-[26px] text-cocoa">{tip.title}</Text>
              <Text className="mt-2 text-[15px] font-bold leading-5 text-mink">{tip.body}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between gap-4">
            <TourDots activeIndex={step} />
            <View className="flex-row items-center gap-3">
              <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}>
                <Text className="text-sm font-black text-mink">Skip</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                className="flex-row items-center gap-2 rounded-full bg-raspberry px-4 py-2.5"
              >
                {isLastStep ? (
                  <Sparkles size={16} stroke={colors.white} strokeWidth={2.7} />
                ) : (
                  <Sparkles size={16} stroke={colors.white} strokeWidth={2.7} />
                )}
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
  const params = useLocalSearchParams<{ appTour?: string; tourStep?: string }>();
  const {
    timeBankSeconds,
    usageWindowSeconds,
    selectedAppsConfigured,
    selectionSummary,
    currentStreak,
    syncTimeBank,
    hasAppAccess,
    requestSubscriptionAccess,
    subscriptionConfigured,
    subscriptionError,
  } = useBootyblock();
  const [, setTick] = useState(Date.now);
  const [tourStep, setTourStep] = useState(params.tourStep === 'streak' ? 2 : 0);
  const tourActive = params.appTour === 'home';
  const activeSpotlight = tourActive ? homeTips[tourStep]?.id ?? null : null;

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

  const hasBank = timeBankSeconds > 0;
  const hasUsageWindow = usageWindowSeconds > 0;
  const showUnlockedState = hasUsageWindow;

  const status = useMemo(() => {
    if (hasUsageWindow) return 'All apps unlocked';
    return 'Locked';
  }, [hasUsageWindow]);
  const blockedAppCount = selectionSummary
    ? selectionSummary.applicationCount + selectionSummary.categoryCount + selectionSummary.webDomainCount
    : 0;
  const blockedAppLabel = `${blockedAppCount} ${blockedAppCount === 1 ? 'app' : 'apps'} blocked`;

  async function openBlockedApps() {
    setTourStep(0);

    if (hasAppAccess) {
      router.replace('/onboarding/apps');
      return;
    }

    const subscribed = await requestSubscriptionAccess();
    if (subscribed) {
      router.replace('/onboarding/apps');
      return;
    }

    if (!subscriptionConfigured) {
      Alert.alert(
        'RevenueCat setup needed',
        subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
      );
    }
  }

  function finishTour() {
    setTourStep(0);
    router.replace('/(tabs)');
  }

  async function openEarnPlan(mode: 'default' | 'earn' = 'default') {
    if (hasAppAccess) {
      router.push(mode === 'earn' ? { pathname: '/(tabs)/plan', params: { mode: 'earn' } } : '/(tabs)/plan');
      return;
    }

    const subscribed = await requestSubscriptionAccess();
    if (subscribed) {
      router.push(mode === 'earn' ? { pathname: '/(tabs)/plan', params: { mode: 'earn' } } : '/(tabs)/plan');
      return;
    }

    if (!subscriptionConfigured) {
      Alert.alert(
        'RevenueCat setup needed',
        subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
      );
    }
  }

  function continueTour() {
    if (tourStep >= homeTips.length - 1) {
      finishTour();
      return;
    }
    setTourStep((current) => Math.min(current + 1, homeTips.length - 1));
  }

  return (
    <Screen>
      <Header
        title="BootyBlock"
        logo
        centerLogo
        logoHeight={48}
        rightAccessory={
          <TourHighlight id="streak" activeId={activeSpotlight}>
            <View
              className="h-11 flex-row items-center gap-1 rounded-full bg-white/70 px-3"
              accessible
              accessibilityLabel={`${currentStreak} day streak`}
            >
              <Flame
                size={18}
                stroke={colors.raspberry}
                fill={currentStreak > 0 ? colors.raspberry : 'transparent'}
              />
              <Text className="text-base font-black text-cocoa">{currentStreak}</Text>
            </View>
          </TourHighlight>
        }
      />

      <TourHighlight id="balance" activeId={activeSpotlight}>
        <View className={`mt-auto overflow-hidden rounded-[40px] p-7 ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}>
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
            <Text className={`mt-2 text-base font-bold ${showUnlockedState ? 'text-mink' : 'text-white/75'}`}>
              {blockedAppLabel}
            </Text>
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
        </View>
      </TourHighlight>

      <View className="mt-auto gap-3 pt-6">
        {hasBank ? (
          <Button label="Use minutes" icon={Flame} onPress={() => void openEarnPlan()} />
        ) : (
          <Button label="Earn minutes" icon={Dumbbell} onPress={() => void openEarnPlan()} />
        )}
        {hasBank ? (
          <Button
            label="Earn more"
            icon={Dumbbell}
            variant="secondary"
            noOutline
            onPress={() => void openEarnPlan('earn')}
          />
        ) : null}
        <Button
          label={selectedAppsConfigured ? 'Change blocked apps' : 'Choose blocked apps'}
          icon={LockKeyhole}
          variant="secondary"
          noOutline
          onPress={() => void openBlockedApps()}
        />
      </View>

      {tourActive ? (
        <HomeTourOverlay
          step={tourStep}
          onNext={continueTour}
          onSkip={finishTour}
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
    bottom: 22,
    left: 0,
    paddingHorizontal: 0,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  tourCard: {
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 16,
  },
});
