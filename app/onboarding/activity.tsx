import { router } from 'expo-router';
import { CalendarDays, Dumbbell, Footprints, Flame, LucideIcon } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  AnimatedOnboardingOption,
  AnimatedOnboardingOptionIcon,
} from '../../components/AnimatedOnboardingOption';
import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type ActivityOption = {
  label: string;
  value: string;
  icon: LucideIcon;
};

const options: ActivityOption[] = [
  { label: 'Never', value: 'never', icon: Footprints },
  { label: '1-3 times per week', value: 'weekly-light', icon: CalendarDays },
  { label: '3-5 times per week', value: 'weekly-active', icon: Dumbbell },
  { label: 'Every day', value: 'daily', icon: Flame },
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
      <OnboardingProgress step={22} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1">
          <View>
            <Text className="text-[15px] font-bold leading-[19px] text-mink">
              Speaking of movement
            </Text>
            <Text className="mt-1.5 text-[28px] font-bold leading-[33px] text-cocoa">
              How often do you currently exercise?
            </Text>
            <Text className="mt-2 text-sm font-bold text-mink">Choose one</Text>
          </View>

          <View className="mt-5 flex-1 gap-3">
            {options.map(({ label, value, icon: Icon }) => {
              const active = currentSelection === value;

              return (
                <AnimatedOnboardingOption
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  selected={active}
                  onPress={() => setSelected(value)}
                  className="min-h-[68px] flex-row items-center gap-4 rounded-full border-2 px-4 py-3"
                >
                  <AnimatedOnboardingOptionIcon
                    selected={active}
                    className="h-11 w-11 items-center justify-center rounded-full"
                  >
                    <Icon size={23} stroke={active ? colors.white : colors.raspberry} strokeWidth={2.4} />
                  </AnimatedOnboardingOptionIcon>
                  <Text className="flex-1 text-base font-bold text-cocoa">{label}</Text>
                </AnimatedOnboardingOption>
              );
            })}
          </View>

          <View className="pt-2.5">
            <Button
              label="Continue"
              disabled={!currentSelection}
              onPress={next}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
