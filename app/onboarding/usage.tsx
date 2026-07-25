import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/AppText';

import { AnimatedOnboardingOption } from '../../components/AnimatedOnboardingOption';
import { Button } from '../../components/Button';
import { NativeRollingNumber } from '../../components/NativeRollingNumber';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import {
  ONBOARDING_STEP_TOTAL,
  ONBOARDING_STEPS,
} from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const CURRENT_MIN_HOURS = 1;
const CURRENT_MAX_HOURS = 10;
const GOAL_MIN_HOURS = 0.5;
const CURRENT_SLIDER_STEP = 1;
const ageOptions = ['14-24', '25-34', '35-44', '45-54', '55+'] as const;
const usageStepMetadata = {
  1: ONBOARDING_STEPS.ageRange,
  2: ONBOARDING_STEPS.currentDailyScreenTime,
} as const;

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function halfOfCurrentHours(currentHours: number) {
  return Math.max(GOAL_MIN_HOURS, currentHours / 2);
}

function UsageHeader({ progressStep, back }: { progressStep: number; back: () => void }) {
  return <OnboardingProgress step={progressStep} onBack={back} />;
}

function TimeSlider({
  value,
  minimumValue,
  maximumValue,
  onChange,
  step,
}: {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onChange: (value: number) => void;
  step: number;
}) {
  const lastValue = useRef(value);
  const previousRenderedValue = useRef(value);
  const lastHapticAt = useRef(0);
  const accent = colors.raspberry;
  const rollDirection = value >= previousRenderedValue.current ? 'up' : 'down';

  useEffect(() => {
    previousRenderedValue.current = value;
    lastValue.current = value;
  }, [value]);

  function update(nextValue: number) {
    const clampedRawValue = Math.min(maximumValue, Math.max(minimumValue, nextValue));
    const steppedValue = Math.round(clampedRawValue / step) * step;
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
    <View>
      <View pointerEvents="none" style={styles.currentValueBlock}>
        <NativeRollingNumber
          value={value}
          color={colors.cocoa}
          countsDown={rollDirection === 'down'}
          fontSize={50}
          fontWeight="900"
          letterSpacing={0}
          style={styles.currentValue}
        />
        <Text className="text-[11px] font-medium leading-[14px] text-mink">
          hours/day
        </Text>
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
          update(value + (nativeEvent.actionName === 'increment' ? step : -step));
        }}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={update}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={colors.petal}
        thumbTintColor={colors.white}
        style={styles.currentSlider}
      />

      <View className="flex-row justify-between px-0.5">
        <Text className="text-[10px] font-medium leading-[13px] text-mink">
          {minimumValue}h
        </Text>
        <Text className="text-[10px] font-medium leading-[13px] text-mink">
          {maximumValue}h
        </Text>
      </View>
    </View>
  );
}

export default function Usage() {
  const { previewStep } = useLocalSearchParams<{ previewStep?: string }>();
  const { dailyScreenTimeHours, setAgeRange, setUsageTargets } =
    useBootyblock();
  const posthog = usePostHog();
  const initialCurrentHours = Math.min(
    CURRENT_MAX_HOURS,
    Math.max(CURRENT_MIN_HOURS, Math.round(dailyScreenTimeHours)),
  );
  const parsedPreviewStep = Number(previewStep);
  const initialStep =
    Number.isInteger(parsedPreviewStep) && parsedPreviewStep >= 1 && parsedPreviewStep <= 2
      ? parsedPreviewStep
      : 1;
  const [step, setStep] = useState(initialStep);
  const [selectedAgeRange, setSelectedAgeRange] = useState('');
  const [currentHours, setCurrentHours] = useState(initialCurrentHours);
  const direction = useStepDirection(step);

  const isAge = step === 1;
  const stepMetadata = usageStepMetadata[step as keyof typeof usageStepMetadata];

  useOnboardingStepAnalytics(
    previewStep ? null : posthog,
    '/onboarding/usage',
    stepMetadata.key,
    stepMetadata.title,
    stepMetadata.index,
    ONBOARDING_STEP_TOTAL,
  );

  function back() {
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  }

  function continueFlow() {
    if (isAge) {
      if (!selectedAgeRange) return;
      setAgeRange(selectedAgeRange);
      setStep(2);
      return;
    }

    setUsageTargets(currentHours, halfOfCurrentHours(currentHours));
    router.push('/onboarding/insights');
  }

  return (
    <Screen scroll={false}>
      {!isAge ? (
        <UsageHeader
          progressStep={previewStep ? step + 4 : stepMetadata.index}
          back={back}
        />
      ) : null}

      <SlidePanel stepKey={step} direction={direction} animateOnMount>
        {isAge ? (
          <View className="flex-1">
            <View className="flex-1 justify-center" style={{ transform: [{ translateY: -32 }] }}>
              <Text className="text-[28px] font-bold leading-[33px] text-cocoa">
                how old are you?
              </Text>

              <View className="mt-6 gap-3">
                {ageOptions.map((option) => {
                  const selected = selectedAgeRange === option;
                  return (
                    <AnimatedOnboardingOption
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      selected={selected}
                      onPress={() => setSelectedAgeRange(option)}
                      className="min-h-[60px] justify-center rounded-full border-2 px-5"
                      style={{ minHeight: 60 }}
                    >
                      <Text className="text-[16px] font-bold text-cocoa">{option}</Text>
                    </AnimatedOnboardingOption>
                  );
                })}
              </View>
            </View>

            <Button
              label="Continue"
              disabled={!selectedAgeRange}
              onPress={continueFlow}
            />
          </View>
        ) : (
          <View className="flex-1">
            <View style={{ marginTop: 75 }}>
              <Text className="max-w-[330px] text-[22px] font-bold leading-[25px] text-cocoa">
                how long are you on your{'\n'}phone each day?
              </Text>
              <Text className="mt-1 text-[11px] font-medium leading-[14px] text-mink">
                be honest
              </Text>
            </View>

            <View className="flex-1 justify-center py-4">
              <TimeSlider
                value={currentHours}
                minimumValue={CURRENT_MIN_HOURS}
                maximumValue={CURRENT_MAX_HOURS}
                onChange={setCurrentHours}
                step={CURRENT_SLIDER_STEP}
              />
            </View>

            <View className="pt-2.5">
              <Button
                label="continue"
                onPress={continueFlow}
              />
            </View>
          </View>
        )}
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currentValueBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  currentValue: {
    height: 58,
    width: 130,
  },
  currentSlider: {
    height: 36,
    width: '100%',
  },
});
