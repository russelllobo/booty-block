import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock3, Dumbbell, LucideIcon, Sparkles } from 'lucide-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { Screen } from '../../components/Screen';
import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type PlanTourTip = {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const planTourTip: PlanTourTip = {
  eyebrow: 'Move first',
  title: 'Earn minutes on this tab',
  body: 'Choose how much time you want back, then start the squat session that banks those minutes.',
  icon: Dumbbell,
};

function TourHighlight({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <View style={[styles.highlightWrap, active ? styles.highlightActive : null]}>
      {children}
      {active ? <View pointerEvents="none" style={styles.highlightRing} /> : null}
    </View>
  );
}

function TourDots() {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          className="h-2.5 rounded-full"
          style={{
            width: index === 1 ? 24 : 10,
            backgroundColor: index === 1 ? colors.raspberry : `${colors.raspberry}33`,
          }}
        />
      ))}
    </View>
  );
}

function PlanTourOverlay({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const TipIcon = planTourTip.icon;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Earn tour background"
        onPress={() => {}}
        style={styles.dimOverlay}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Earn tour touch blocker"
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
              <Text className="text-xs font-black uppercase tracking-wide text-mink">{planTourTip.eyebrow}</Text>
              <Text className="mt-1 text-[22px] font-black leading-[26px] text-cocoa">{planTourTip.title}</Text>
              <Text className="mt-2 text-[15px] font-bold leading-5 text-mink">{planTourTip.body}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between gap-4">
            <TourDots />
            <View className="flex-row items-center gap-3">
              <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}>
                <Text className="text-sm font-black text-mink">Skip</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                className="flex-row items-center gap-2 rounded-full bg-raspberry px-4 py-2.5"
              >
                <Sparkles size={16} stroke={colors.white} strokeWidth={2.7} />
                <Text className="text-sm font-black text-white">Next</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

export default function Plan() {
  const {
    requestedMinutes,
    setRequestedMinutes,
    timeBankSeconds,
    useBankedTime,
    hasAppAccess,
    subscriptionConfigured,
    subscriptionError,
    requestSubscriptionAccess,
  } = useBootyblock();
  const params = useLocalSearchParams<{ mode?: string; tour?: string }>();
  const tourActive = params.tour === 'onboarding';
  const hasBank = timeBankSeconds > 0;
  const maxSpendMinutes = Math.max(1, Math.ceil(timeBankSeconds / 60));
  const [mode, setMode] = useState<'spend' | 'earn'>(hasBank && params.mode !== 'earn' ? 'spend' : 'earn');
  const [spendMinutes, setSpendMinutes] = useState(Math.min(10, maxSpendMinutes));
  const [spending, setSpending] = useState(false);
  const earningTarget = requestedMinutes * MINUTES_TO_SQUATS;
  const spendTarget = Math.min(spendMinutes, maxSpendMinutes);
  const sliderMinutes = mode === 'spend' ? spendTarget : requestedMinutes;
  const sliderMax = mode === 'spend' ? maxSpendMinutes : 60;
  const title = mode === 'spend' ? 'Use banked time' : 'Bank app time';
  const subtitle = mode === 'spend'
    ? 'Choose how many minutes to use your blocked apps for.'
    : 'Choose how much time to earn, then pay in squats.';
  const primaryLabel = mode === 'spend' ? `Use ${spendTarget} min` : `Start ${earningTarget} squats`;
  const primaryIcon = mode === 'spend' ? Clock3 : Dumbbell;

  useEffect(() => {
    if (!hasBank && mode === 'spend') {
      setMode('earn');
    }
  }, [hasBank, mode]);

  useEffect(() => {
    if (tourActive) {
      setMode('earn');
    }
  }, [tourActive]);

  useEffect(() => {
    setSpendMinutes((current) => Math.min(Math.max(1, current), maxSpendMinutes));
  }, [maxSpendMinutes]);

  function updateSliderMinutes(minutes: number) {
    if (mode === 'spend') {
      setSpendMinutes(Math.min(maxSpendMinutes, Math.max(1, minutes)));
      return;
    }

    setRequestedMinutes(minutes);
  }

  async function handlePrimaryPress() {
    if (!hasAppAccess) {
      const subscribed = await requestSubscriptionAccess();
      if (!subscribed) {
        Alert.alert(
          subscriptionConfigured ? 'Subscription needed' : 'RevenueCat setup needed',
          subscriptionConfigured
            ? 'Subscribe to unlock Bootyblock app blocking and squat-to-unlock sessions.'
            : subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
        return;
      }
    }

    if (mode === 'spend') {
      setSpending(true);
      try {
        const started = await useBankedTime(spendTarget);
        if (started) {
          router.replace('/(tabs)');
        }
      } finally {
        setSpending(false);
      }
      return;
    }

    router.push('/session');
  }

  return (
    <Screen>
      <Header title={title} subtitle={subtitle} />

      {hasBank ? (
        <View className="mb-3 flex-row rounded-full bg-white/70 p-1">
          {(['spend', 'earn'] as const).map((option) => {
            const active = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(option)}
                className={['min-h-11 flex-1 items-center justify-center rounded-full', active ? 'bg-raspberry' : 'bg-transparent'].join(' ')}
              >
                <Text className={['text-sm font-black', active ? 'text-white' : 'text-mink'].join(' ')}>
                  {option === 'spend' ? 'Use time' : 'Earn more'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TourHighlight active={tourActive}>
        <View className="items-center rounded-[32px] bg-white/70 p-5">
          <View className="my-3 h-[154px] items-center justify-center">
            <NativeRollingNumber
              value={sliderMinutes}
              color={colors.cocoa}
              fontSize={124}
              fontWeight="900"
              style={{ width: 240, height: 132 }}
            />
            <Text
              className="-mt-3 text-center font-black uppercase text-raspberry"
              style={{ fontSize: 30, letterSpacing: 1.5, lineHeight: 34 }}
            >
              minutes
            </Text>
          </View>

          <View className="mt-4 w-full">
            <Slider
              accessibilityLabel={mode === 'spend' ? 'Minutes to use from bank' : 'Minutes to bank for blocked apps'}
              accessibilityValue={{
                min: 1,
                max: sliderMax,
                now: sliderMinutes,
                text: `${sliderMinutes} minutes`,
              }}
              minimumValue={1}
              maximumValue={sliderMax}
              step={1}
              value={sliderMinutes}
              onValueChange={updateSliderMinutes}
              minimumTrackTintColor={colors.raspberry}
              maximumTrackTintColor={colors.petal}
              thumbTintColor={colors.raspberry}
            />
            <View className="mt-1 flex-row justify-between px-1">
              <Text className="text-xs font-black text-mink">1 min</Text>
              <Text className="text-xs font-black text-mink">{sliderMax} min</Text>
            </View>
          </View>
        </View>
      </TourHighlight>

      <View className="mt-4 rounded-[24px] border border-white/70 bg-white/65 p-4">
        <Text className="text-lg font-black text-cocoa">The rule</Text>
        <Text className="mt-1 text-sm font-semibold leading-5 text-mink">
          {mode === 'spend'
            ? 'Selected minutes leave your bank, then blocked apps open until time runs out.'
            : 'One minute costs one squat. Banked time waits until you choose to use it.'}
        </Text>
      </View>

      {!hasAppAccess ? (
        <View className="mt-4 rounded-[24px] border border-white/70 bg-white/65 p-4">
          <Text className="text-lg font-black text-cocoa">Bootyblock Pro</Text>
          <Text className="mt-1 text-sm font-semibold leading-5 text-mink">
            A subscription keeps app blocking, squat sessions, progress stats, and unlock windows active on this iPhone.
          </Text>
        </View>
      ) : null}

      <View className="mt-auto pt-4">
        <Button label={primaryLabel} icon={primaryIcon} onPress={handlePrimaryPress} loading={spending} />
      </View>

      {tourActive ? (
        <PlanTourOverlay
          onNext={() => router.replace({ pathname: '/(tabs)', params: { tour: 'onboarding', tourStep: 'streak' } })}
          onSkip={() => router.replace('/onboarding/apps')}
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
    borderRadius: 34,
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
