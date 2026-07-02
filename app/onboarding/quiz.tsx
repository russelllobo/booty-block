import { router } from 'expo-router';
import {
  BedDouble,
  BriefcaseBusiness,
  Flame,
  Footprints,
  GraduationCap,
  Heart,
  Hourglass,
  Medal,
  Smile,
  Users,
  Weight,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import {
  AnimatedOnboardingOption,
  AnimatedOnboardingOptionIcon,
} from '../../components/AnimatedOnboardingOption';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type Goal = {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
};

const goals: Goal[] = [
  { label: 'Reduce screen time', icon: Hourglass },
  { label: 'Quit late-night scrolling', icon: BedDouble },
  { label: 'Build consistency & self-control', icon: Flame },
  { label: 'Better focus for study', icon: GraduationCap },
  { label: 'Improved productivity at work', icon: BriefcaseBusiness },
  { label: 'Move more every day', icon: Footprints },
  { label: 'Boost energy & mood', icon: Smile },
  { label: 'Lose weight', icon: Weight },
  { label: 'Be more present', icon: Heart },
  { label: 'Less social isolation', icon: Users },
  { label: 'Join challenges & compete', icon: Medal },
];

const FOCUSED_BOTTOM_PADDING = 132;
const quizStepMetadata = {
  1: ONBOARDING_STEPS.profileName,
  2: ONBOARDING_STEPS.goals,
} as const;

const NAME_LETTER_STYLE = {
  color: colors.cocoa,
  fontSize: 72,
  fontWeight: '700' as const,
  includeFontPadding: false,
  letterSpacing: 0.4,
  lineHeight: 82,
};

function QuizHeader({ step, back }: { step: number; back: () => void }) {
  return (
    <OnboardingProgress step={step + 1} onBack={back} />
  );
}

function NameDisplay({ name }: { name: string }) {
  if (name.length === 0) {
    return (
      <Text className="text-[54px] font-bold leading-[62px] text-mink/35">
        Your name
      </Text>
    );
  }

  return (
    <Text style={NAME_LETTER_STYLE}>
      {name}
    </Text>
  );
}

export default function Quiz() {
  const { setOnboardingGoals, setProfileName } = useBootyblock();
  const posthog = usePostHog();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const nameInputRef = useRef<TextInput>(null);
  const direction = useStepDirection(step);
  const stepMetadata = quizStepMetadata[step as keyof typeof quizStepMetadata];

  useEffect(() => {
    if (step !== 1) return;

    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 350);

    return () => clearTimeout(focusTimer);
  }, [step]);

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/quiz',
    stepMetadata.key,
    stepMetadata.title,
    stepMetadata.index,
    ONBOARDING_STEP_TOTAL,
  );

  function toggleGoal(label: string) {
    setSelectedGoals((current) => {
      if (current.includes(label)) return current.filter((goal) => goal !== label);
      if (current.length === 3) return current;
      return [...current, label];
    });
  }

  function back() {
    if (step > 1) {
      setStep((current) => current - 1);
    } else {
      router.back();
    }
  }

  return (
    <Screen scroll={false}>
      <QuizHeader step={step} back={back} />

      <SlidePanel stepKey={step} direction={direction}>
        {step === 1 ? (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: focused ? FOCUSED_BOTTOM_PADDING : 24,
              }}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-1">
                <View className="pt-1">
                  <Text className="text-[15px] font-bold leading-[19px] text-mink">
                    First things first,
                  </Text>
                  <Text className="mt-1.5 text-[28px] font-bold leading-[33px] text-cocoa">
                    What should we{'\n'}call you?
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Name input"
                  onPress={() => nameInputRef.current?.focus()}
                  className="mt-6 min-h-[176px] justify-center"
                >
                  <View
                    className="min-h-[142px] flex-row flex-wrap content-center items-center"
                    pointerEvents="none"
                  >
                    <NameDisplay name={name} />
                  </View>

                  <TextInput
                    ref={nameInputRef}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    caretHidden
                    placeholder="Your name"
                    placeholderTextColor={colors.mink}
                    returnKeyType="next"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={() => name.trim() && setStep(2)}
                    className="absolute inset-0 text-[1px] text-transparent"
                    style={{
                      includeFontPadding: false,
                      opacity: 0.01,
                      paddingBottom: 0,
                      paddingTop: 0,
                    }}
                    selectionColor={colors.raspberry}
                  />

                </Pressable>

                <View className="flex-1" />

                <View className="pt-5">
                  <Button label="Continue" disabled={!name.trim()} onPress={() => setStep(2)} />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View className="flex-1">
            <Text className="text-lg font-bold text-mink">So, tell us, {name.trim()},</Text>
            <Text className="mt-2 text-[28px] font-bold leading-[33px] text-cocoa">
              What goals do you want to achieve using Bootyblock?
            </Text>
            <Text className="mt-2 text-base font-bold text-mink">Choose up to 3</Text>

            <ScrollView
              className="mt-5 flex-1"
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {goals.map(({ label, icon: Icon }) => {
                const selected = selectedGoals.includes(label);
                return (
                  <AnimatedOnboardingOption
                    key={label}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    selected={selected}
                    onPress={() => toggleGoal(label)}
                    className="min-h-[68px] flex-row items-center gap-4 rounded-full border-2 px-4 py-3"
                  >
                    <AnimatedOnboardingOptionIcon
                      selected={selected}
                      className="h-11 w-11 items-center justify-center rounded-full"
                    >
                      <Icon
                        size={22}
                        stroke={selected ? colors.white : colors.raspberry}
                        strokeWidth={2.4}
                      />
                    </AnimatedOnboardingOptionIcon>
                    <Text className="flex-1 text-base font-bold text-cocoa">{label}</Text>
                  </AnimatedOnboardingOption>
                );
              })}
            </ScrollView>

            <Button
              label="Continue"
              disabled={selectedGoals.length === 0}
              onPress={() => {
                setProfileName(name);
                setOnboardingGoals(selectedGoals);
                router.push('/onboarding/usage');
              }}
            />
          </View>
        )}
      </SlidePanel>
    </Screen>
  );
}
