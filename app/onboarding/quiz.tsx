import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { ComponentType, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from '../../components/AppText';

import { Button } from '../../components/Button';
import {
  AnimatedOnboardingOption,
  AnimatedOnboardingOptionIcon,
} from '../../components/AnimatedOnboardingOption';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, onboardingLightGradient } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import {
  HIDDEN_ONBOARDING_STEPS,
  ONBOARDING_STEP_TOTAL,
  ONBOARDING_STEPS,
} from '../../lib/onboardingSteps';
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
  2: HIDDEN_ONBOARDING_STEPS.goals,
} as const;

function QuizHeader({ step, back }: { step: number; back: () => void }) {
  return (
    <OnboardingProgress
      step={step === 1 ? ONBOARDING_STEPS.profileName.index : 6}
      onBack={back}
    />
  );
}

function GluteJourneyPreview({ name }: { name: string }) {
  const journeyOwner = name.trim() ? `${name.trim()}'s` : 'Your';
  const currentDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <LinearGradient
      colors={onboardingLightGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.journeyCard}
    >
      <View style={styles.journeyHeader}>
        <View>
          <Text
            style={styles.journeyTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {journeyOwner} 90 day glute journey
          </Text>
          <Text style={styles.journeyProgress}>0% Complete</Text>
        </View>
        <Text style={styles.journeyFire}>🔥</Text>
      </View>

      <View style={styles.journeyGrid}>
        {Array.from({ length: 9 }, (_, row) => (
          <View key={row} style={styles.journeyRow}>
            {Array.from({ length: 10 }, (_, column) => (
              <View
                key={column}
                style={styles.journeyCell}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.journeyFooter}>
        <Text style={styles.journeyFooterText}>{currentDate}</Text>
      </View>
    </LinearGradient>
  );
}

export default function Quiz() {
  const { previewStep } = useLocalSearchParams<{ previewStep?: string }>();
  const initialStep = previewStep === '2' ? 2 : 1;
  const { setOnboardingGoals, setProfileName } = useBootyblock();
  const posthog = usePostHog();
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(previewStep ? 'Russ' : '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const direction = useStepDirection(step);
  const stepMetadata = quizStepMetadata[step as keyof typeof quizStepMetadata];

  useOnboardingStepAnalytics(
    previewStep ? null : posthog,
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

  function continueFromName() {
    if (previewStep) {
      setStep(2);
      return;
    }

    setProfileName(name);
    setOnboardingGoals([]);
    router.push('/onboarding/usage');
  }

  return (
    <Screen scroll={false}>
      <QuizHeader step={step} back={back} />

      <SlidePanel stepKey={step} direction={direction} animateOnMount>
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
                paddingBottom: FOCUSED_BOTTOM_PADDING,
              }}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-1">
                <Text
                  style={styles.confidenceHeading}
                >
                  Ready to rebuild your confidence?
                </Text>

                <View className="mt-4">
                  <GluteJourneyPreview name={name} />
                </View>

                <View className="mt-5">
                  <Text className="mb-2 text-[14px] font-bold text-mink">
                    What should we call you?
                  </Text>
                  <TextInput
                    accessibilityLabel="Your name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(125, 90, 103, 0.52)"
                    returnKeyType="next"
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={() => name.trim() && continueFromName()}
                    className="h-14 rounded-2xl border-2 border-cocoa bg-white/75 px-4 text-[17px] font-bold text-cocoa"
                    style={styles.nameInput}
                    selectionColor={colors.raspberry}
                  />
                </View>

                <View className="mt-4">
                  <Button label="continue" disabled={!name.trim()} onPress={continueFromName} />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View className="flex-1">
            <Text className="text-lg font-bold text-mink">So, tell us, {name.trim()},</Text>
            <Text
              className="mt-2 text-[28px] font-bold leading-[33px] text-cocoa"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              What goals do you want to{'\n'}achieve using BootyBlock?
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
              label="continue"
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

const styles = StyleSheet.create({
  nameInput: {
    borderRadius: 14,
  },
  confidenceHeading: {
    width: '100%',
    color: colors.cocoa,
    fontSize: 35,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: 'center',
  },
  journeyCard: {
    overflow: 'hidden',
    paddingHorizontal: 17,
    paddingBottom: 13,
    paddingTop: 16,
    borderRadius: 22,
    shadowColor: '#3A1F2C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  journeyTitle: {
    color: colors.cocoa,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 23,
  },
  journeyProgress: {
    marginTop: 2,
    color: colors.mink,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  journeyFire: {
    fontSize: 31,
    lineHeight: 35,
  },
  journeyGrid: {
    marginTop: 14,
    gap: 4,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  journeyCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 115, 0.18)',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  journeyFooter: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyFooterText: {
    color: colors.mink,
    fontSize: 13,
    fontWeight: '800',
  },
});
