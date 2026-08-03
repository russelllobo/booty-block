import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AnimatedOnboardingOption } from '../../components/AnimatedOnboardingOption';
import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type ActivityOption = {
  label: string;
  value: string;
};

const options: ActivityOption[] = [
  { label: 'never', value: 'never' },
  { label: '1-3 times per week', value: 'weekly-light' },
  { label: '3-5 times per week', value: 'weekly-active' },
  { label: 'every day', value: 'daily' },
];

export default function Activity() {
  const { exerciseFrequency, setExerciseFrequency } = useBootyblock();
  const posthog = usePostHog();
  const [selected, setSelected] = useState<string | null>(null);
  const currentSelection = selected ?? exerciseFrequency;

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/activity',
    ONBOARDING_STEPS.exerciseFrequency.key,
    ONBOARDING_STEPS.exerciseFrequency.title,
    ONBOARDING_STEPS.exerciseFrequency.index,
    ONBOARDING_STEP_TOTAL,
  );

  function next() {
    if (!currentSelection) return;
    setExerciseFrequency(currentSelection);
    captureAnalytics(posthog, 'onboarding_activity_selected', {
      exercise_frequency: currentSelection,
    });
    router.push('/onboarding/finish');
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress
        step={ONBOARDING_STEPS.exerciseFrequency.index}
        onBack={() => router.back()}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1">
          <View>
            <Text className="text-[28px] font-bold leading-[33px] text-cocoa">
              how often do you currently exercise?
            </Text>
            <Text className="mt-2 text-sm font-bold text-mink">choose one</Text>
          </View>

          <View className="mt-5 flex-1 gap-3">
            {options.map(({ label, value }) => {
              const active = currentSelection === value;

              return (
                <AnimatedOnboardingOption
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  selected={active}
                  onPress={() => {
                    setSelected(value);
                    setExerciseFrequency(value);
                  }}
                  className="min-h-[68px] flex-row items-center rounded-full border-2 px-5 py-3"
                >
                  <Text className="flex-1 text-base font-bold text-cocoa">{label}</Text>
                </AnimatedOnboardingOption>
              );
            })}
          </View>

          <View className="pt-2.5">
            <Button
              label="continue"
              disabled={!currentSelection}
              onPress={next}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
