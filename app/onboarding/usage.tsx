import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const CURRENT_MIN_HOURS = 2;
const CURRENT_MAX_HOURS = 8;
const GOAL_MIN_HOURS = 0.5;
const SLIDER_STEP = 0.5;
const usageStepMetadata = {
  1: {
    key: 'current_daily_screen_time',
    title: 'How much time do you spend on your phone every day?',
  },
  2: {
    key: 'goal_daily_screen_time',
    title: 'How much time would you like to spend instead?',
  },
} as const;

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function splitHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  return {
    hours: String(hours),
    minutes: String(minutes).padStart(2, '0'),
  };
}

function daysPerYear(hoursPerDay: number) {
  return Math.round((hoursPerDay * 365) / 24);
}

function halfOfCurrentHours(currentHours: number) {
  return Math.max(GOAL_MIN_HOURS, currentHours / 2);
}

function UsageHeader({ step, back }: { step: number; back: () => void }) {
  return <OnboardingProgress step={step + 3} onBack={back} />;
}

function TimeSlider({
  value,
  minimumValue,
  maximumValue,
  onChange,
  tone,
}: {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onChange: (value: number) => void;
  tone: 'pink' | 'mint';
}) {
  const lastValue = useRef(value);
  const previousRenderedValue = useRef(value);
  const lastHapticAt = useRef(0);
  const accent = tone === 'pink' ? colors.raspberry : '#32B764';
  const rollDirection = value >= previousRenderedValue.current ? 'up' : 'down';
  const timeParts = splitHours(value);

  useEffect(() => {
    previousRenderedValue.current = value;
    lastValue.current = value;
  }, [value]);

  function update(nextValue: number) {
    const clampedRawValue = Math.min(maximumValue, Math.max(minimumValue, nextValue));
    const steppedValue = Math.round(clampedRawValue / SLIDER_STEP) * SLIDER_STEP;
    const clampedValue = Math.min(maximumValue, Math.max(minimumValue, steppedValue));

    if (clampedValue !== lastValue.current) {
      lastValue.current = clampedValue;
      onChange(clampedValue);

      const now = Date.now();
      if (now - lastHapticAt.current > 90) {
        lastHapticAt.current = now;
        void Haptics.selectionAsync();
      }
    }
  }

  return (
    <View
      className="rounded-[32px] border border-white/80 bg-white/85 px-6 pb-6 pt-7"
      style={shadow}
    >
      <View style={styles.sliderFrame}>
        <View pointerEvents="none" style={styles.valueLabel}>
          <View style={styles.valueRow}>
            <NativeRollingNumber
              value={timeParts.hours}
              color={accent}
              countsDown={rollDirection === 'down'}
              fontSize={34}
              fontWeight="900"
              letterSpacing={0}
              style={styles.hoursValue}
            />
            <Text style={[styles.valueUnit, { color: accent }]}>h</Text>
            <NativeRollingNumber
              value={timeParts.minutes}
              color={accent}
              countsDown={rollDirection === 'down'}
              fontSize={34}
              fontWeight="900"
              letterSpacing={0}
              style={styles.minutesValue}
            />
            <Text style={[styles.valueUnit, { color: accent }]}>m</Text>
          </View>
        </View>

        <Slider
          accessibilityLabel="Daily screen time in hours"
          accessibilityValue={{
            min: minimumValue,
            max: maximumValue,
            now: value,
            text: formatHours(value),
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Increase screen time' },
            { name: 'decrement', label: 'Decrease screen time' },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            update(value + (nativeEvent.actionName === 'increment' ? SLIDER_STEP : -SLIDER_STEP));
          }}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={SLIDER_STEP}
          value={value}
          onValueChange={update}
          minimumTrackTintColor={accent}
          maximumTrackTintColor={colors.petal}
          thumbTintColor={accent}
          style={styles.nativeSlider}
        />
      </View>
      <View className="mt-1 flex-row justify-between px-1">
        <Text className="text-xs font-black text-mink">{formatHours(minimumValue)}</Text>
        <Text className="text-xs font-black text-mink">{formatHours(maximumValue)}</Text>
      </View>
    </View>
  );
}

export default function Usage() {
  const { profileName, dailyScreenTimeHours, setUsageTargets } =
    useBootyblock();
  const posthog = usePostHog();
  const initialCurrentHours = Math.min(
    CURRENT_MAX_HOURS,
    Math.max(CURRENT_MIN_HOURS, dailyScreenTimeHours),
  );
  const [step, setStep] = useState(1);
  const [currentHours, setCurrentHours] = useState(initialCurrentHours);
  const [goalHours, setGoalHours] = useState(halfOfCurrentHours(initialCurrentHours));
  const direction = useStepDirection(step);

  const isGoal = step === 2;
  const stepMetadata = usageStepMetadata[step as keyof typeof usageStepMetadata];
  const name = profileName || 'you';
  const sliderMinimum = isGoal ? GOAL_MIN_HOURS : CURRENT_MIN_HOURS;
  const sliderMaximum = isGoal ? Math.max(GOAL_MIN_HOURS, currentHours) : CURRENT_MAX_HOURS;

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/usage',
    stepMetadata.key,
    stepMetadata.title,
    step + 4,
    30,
  );

  function back() {
    if (isGoal) {
      setStep(1);
      return;
    }
    router.back();
  }

  function continueFlow() {
    if (!isGoal) {
      setGoalHours(halfOfCurrentHours(currentHours));
      setStep(2);
      return;
    }

    setUsageTargets(currentHours, goalHours);
    router.push('/onboarding/insights');
  }

  return (
    <Screen scroll={false}>
      <UsageHeader step={step} back={back} />

      <SlidePanel stepKey={step} direction={direction}>
        <View className="flex-1">
          <View>
            <Text className="text-[15px] font-bold leading-[19px] text-mink">
              {isGoal
                ? `No guilt, ${name}. Small changes stick.`
                : 'A quick reality check — no judgement.'}
            </Text>
            <Text className="mt-1.5 text-[28px] font-bold leading-[33px] text-cocoa">
              {isGoal
                ? 'How much time would you like to spend instead?'
                : 'How much time do you spend on your phone every day?'}
            </Text>
          </View>

          <View className="flex-1 justify-center py-4">
            <TimeSlider
              value={isGoal ? goalHours : currentHours}
              minimumValue={sliderMinimum}
              maximumValue={sliderMaximum}
              onChange={isGoal ? setGoalHours : setCurrentHours}
              tone={isGoal ? 'mint' : 'pink'}
            />
          </View>

          <View className="pt-2.5">
            <Button
              label={isGoal ? 'Build my plan' : 'Continue'}
              onPress={continueFlow}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sliderFrame: {
    paddingTop: 44,
    position: 'relative',
  },
  valueLabel: {
    alignItems: 'center',
    bottom: 36,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 46,
    justifyContent: 'center',
  },
  hoursValue: {
    height: 46,
    width: 28,
  },
  minutesValue: {
    height: 46,
    marginLeft: 7,
    width: 48,
  },
  valueUnit: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 42,
  },
  nativeSlider: {
    width: '100%',
    height: 44,
  },
});
