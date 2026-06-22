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
  X,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
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
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
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

const NAME_INPUT_HEIGHT = 64;
const FOCUSED_BOTTOM_PADDING = 132;

function QuizHeader({ step, back }: { step: number; back: () => void }) {
  return (
    <OnboardingProgress step={step + 1} onBack={back} />
  );
}

export default function Quiz() {
  const { setProfileName } = useBootyblock();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const direction = useStepDirection(step);

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

                <View
                  className={[
                    'mt-6 h-16 flex-row items-center gap-4 rounded-full border-2 bg-white px-6',
                    focused ? 'border-raspberry' : 'border-petal',
                  ].join(' ')}
                  style={shadow}
                >
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder="Your name"
                    placeholderTextColor={colors.mink}
                    returnKeyType="next"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={() => name.trim() && setStep(2)}
                    className="h-16 flex-1 text-xl font-bold text-cocoa"
                    style={{
                      height: NAME_INPUT_HEIGHT,
                      includeFontPadding: false,
                      paddingBottom: 0,
                      paddingTop: 0,
                      textAlignVertical: 'center',
                    }}
                    selectionColor={colors.raspberry}
                  />

                  {name.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear name"
                      onPress={() => setName('')}
                      className="h-8 w-8 items-center justify-center rounded-full bg-petal"
                    >
                      <X size={16} stroke={colors.raspberry} strokeWidth={3} />
                    </Pressable>
                  ) : (
                    <View className="h-8 w-8" />
                  )}
                </View>

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
                  <Pressable
                    key={label}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleGoal(label)}
                    className={[
                      'min-h-[68px] flex-row items-center gap-4 rounded-full border-2 px-4 py-3',
                      selected ? 'border-raspberry bg-petal' : 'border-petal bg-white/75',
                    ].join(' ')}
                  >
                    <View
                      className={[
                        'h-11 w-11 items-center justify-center rounded-full',
                        selected ? 'bg-raspberry' : 'bg-petal',
                      ].join(' ')}
                    >
                      <Icon
                        size={22}
                        stroke={selected ? colors.white : colors.raspberry}
                        strokeWidth={2.4}
                      />
                    </View>
                    <Text className="flex-1 text-base font-bold text-cocoa">{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Button
              label="Continue"
              disabled={selectedGoals.length === 0}
              onPress={() => {
                setProfileName(name);
                router.push('/onboarding/usage');
              }}
            />
          </View>
        )}
      </SlidePanel>
    </Screen>
  );
}
