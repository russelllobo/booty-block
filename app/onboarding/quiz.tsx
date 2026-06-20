import { LinearGradient } from 'expo-linear-gradient';
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
  Sparkles,
  User,
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
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <Screen scroll={false}>
      <QuizHeader step={step} back={back} />

      <SlidePanel stepKey={step} direction={direction}>
        {step === 1 ? (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="flex-1 items-center justify-center">
              <View className="relative">
                <View
                  className="h-24 w-24 rounded-[36px] border border-white/80 bg-white/60 p-[3px]"
                  style={shadow}
                >
                  <LinearGradient
                    colors={[colors.raspberry, colors.bubble, colors.petal]}
                    className="flex-1 items-center justify-center rounded-[32px]"
                  >
                    {initial ? (
                      <Text className="text-[52px] font-black leading-none text-white">
                        {initial}
                      </Text>
                    ) : (
                      <User size={40} stroke={colors.white} strokeWidth={2.4} />
                    )}
                  </LinearGradient>
                </View>
                <Sparkles
                  size={20}
                  stroke={colors.raspberry}
                  strokeWidth={2}
                  style={{ position: 'absolute', top: -2, left: -24, opacity: 0.7 }}
                />
                <Sparkles
                  size={15}
                  stroke={colors.cherry}
                  strokeWidth={2}
                  style={{ position: 'absolute', bottom: -2, right: -20, opacity: 0.6 }}
                />
              </View>

              <Text className="mt-8 text-lg font-bold text-mink">First things first,</Text>
              <Text className="mt-2 text-center text-[34px] font-black leading-[39px] tracking-[-1.1px] text-cocoa">
                What should we{'\n'}call you?
              </Text>
              <Text className="mt-3 text-center text-base font-semibold text-mink">
                We'll cheer you on by name.
              </Text>
            </View>

            <View
              className={[
                'h-[82px] flex-row items-center gap-4 rounded-[26px] border-2 bg-white px-5',
                focused ? 'border-raspberry' : 'border-petal',
              ].join(' ')}
              style={shadow}
            >
              <View
                className={[
                  'h-11 w-11 items-center justify-center rounded-full',
                  initial ? 'bg-raspberry' : 'bg-petal',
                ].join(' ')}
              >
                <User
                  size={20}
                  stroke={initial ? colors.white : colors.raspberry}
                  strokeWidth={2.6}
                />
              </View>

              <View className="flex-1 justify-center">
                {(focused || name.length > 0) && (
                  <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-mink">
                    Your name
                  </Text>
                )}
                <TextInput
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder={focused || name.length > 0 ? '' : 'Your name'}
                  placeholderTextColor={colors.mink}
                  returnKeyType="next"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={() => name.trim() && setStep(2)}
                  className="text-xl font-bold text-cocoa"
                  selectionColor={colors.raspberry}
                />
              </View>

              {name.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear name"
                  onPress={() => setName('')}
                  className="h-8 w-8 items-center justify-center rounded-full bg-petal"
                >
                  <X size={16} stroke={colors.raspberry} strokeWidth={3} />
                </Pressable>
              ) : focused ? (
                <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-petal">
                  <View className="h-1.5 w-1.5 rounded-full bg-raspberry/60" />
                </View>
              ) : null}
            </View>

            <View className="pt-4">
              <Button label="Continue" disabled={!name.trim()} onPress={() => setStep(2)} />
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View className="flex-1">
            <Text className="text-lg font-bold text-mink">So, tell us, {name.trim()},</Text>
            <Text className="mt-2 text-[32px] font-black leading-[36px] tracking-[-1px] text-cocoa">
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
