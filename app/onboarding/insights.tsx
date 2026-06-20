import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AppWindow,
  Bot,
  Check,
  CircleUserRound,
  Clock3,
  Gamepad2,
  Heart,
  Infinity,
  MessageCircle,
  Play,
  ShoppingBag,
  Sparkles,
  Star,
  Tv,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';

type Choice = {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
};

const distractingApps: Choice[] = [
  { label: 'TikTok', icon: Video },
  { label: 'YouTube', icon: Play },
  { label: 'Instagram', icon: CircleUserRound },
  { label: 'Facebook', icon: Users },
  { label: 'Mobile games', icon: Gamepad2 },
  { label: 'X / Twitter', icon: X },
  { label: 'Reddit', icon: Bot },
  { label: 'Discord', icon: MessageCircle },
  { label: 'Online shopping', icon: ShoppingBag },
  { label: 'Twitch', icon: Tv },
  { label: 'Netflix or streaming', icon: AppWindow },
  { label: 'Snapchat', icon: Zap },
];

const frictionReasons: Choice[] = [
  { label: 'Fear of missing out (FOMO)', icon: Users },
  { label: 'Addictive app design', icon: Infinity },
  { label: 'It’s just automatic — no reason', icon: Clock3 },
  { label: 'It fills boring moments', icon: Sparkles },
];

const reviews = [
  {
    name: 'Lucas M.',
    quote: 'This gives me a reason to exercise and cuts my screen time. A really good idea.',
  },
  {
    name: 'Jo J.',
    quote: 'The best thing that’s happened to my motivation — it gets me off social media.',
  },
];

function ChoiceRow({
  choice,
  selected,
  onPress,
}: {
  choice: Choice;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = choice.icon;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={[
        'min-h-[62px] flex-row items-center gap-4 rounded-full border-2 px-3 py-2.5',
        selected ? 'border-raspberry bg-petal' : 'border-petal bg-white/75',
      ].join(' ')}
    >
      <View
        className={[
          'h-11 w-11 items-center justify-center rounded-full',
          selected ? 'bg-raspberry' : 'bg-petal',
        ].join(' ')}
      >
        {selected ? (
          <Check size={22} stroke={colors.white} strokeWidth={3} />
        ) : (
          <Icon size={21} stroke={colors.raspberry} strokeWidth={2.4} />
        )}
      </View>
      <Text className="flex-1 text-[15px] font-bold leading-5 text-cocoa">{choice.label}</Text>
    </Pressable>
  );
}

function ReviewCard({ name, quote }: { name: string; quote: string }) {
  return (
    <View
      className="rounded-[24px] border border-white/80 bg-white/75 px-4 py-4"
      style={shadow}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-petal">
          <Heart size={19} fill={colors.raspberry} stroke={colors.raspberry} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-black text-cocoa">{name}</Text>
          <View className="mt-0.5 flex-row">
            {[0, 1, 2, 3, 4].map((star) => (
              <Star
                key={star}
                size={13}
                fill="#F7B731"
                stroke="#F7B731"
                strokeWidth={2}
              />
            ))}
          </View>
        </View>
      </View>
      <Text className="mt-3 text-sm font-semibold leading-5 text-mink">“{quote}”</Text>
    </View>
  );
}

export default function Insights() {
  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const direction = useStepDirection(step);

  const progressStep = step + 5;
  const choosingApps = step === 2;
  const choices = choosingApps ? distractingApps : frictionReasons;
  const selected = choosingApps ? selectedApps : selectedReasons;

  function toggle(
    label: string,
    current: string[],
    setSelected: (next: string[]) => void,
  ) {
    if (current.includes(label)) {
      setSelected(current.filter((item) => item !== label));
      return;
    }
    if (current.length >= 3) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSelected([...current, label]);
  }

  function back() {
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={progressStep} onBack={back} />

      <SlidePanel stepKey={step} direction={direction}>
        {step === 1 ? (
          <View className="flex-1">
            <View className="flex-1 justify-center">
              <View className="items-center">
                <View className="relative items-center justify-center">
                  <View className="h-32 w-32 items-center justify-center rounded-full bg-petal">
                    <View className="h-24 w-24 items-center justify-center rounded-full bg-white/80">
                      <Users size={45} stroke={colors.raspberry} strokeWidth={2.3} />
                    </View>
                  </View>
                  <Sparkles
                    size={25}
                    stroke={colors.raspberry}
                    strokeWidth={2}
                    style={{ position: 'absolute', right: -15, top: 5 }}
                  />
                  <Sparkles
                    size={18}
                    stroke={colors.cherry}
                    strokeWidth={2}
                    style={{ position: 'absolute', bottom: 8, left: -15 }}
                  />
                </View>

                <Text className="mt-6 text-center text-[31px] font-black leading-[35px] tracking-[-1px] text-cocoa">
                  You’re joining more than{'\n'}
                  <Text className="text-raspberry">1,000,000 people</Text>
                </Text>
                <Text className="mt-3 text-center text-base font-bold leading-6 text-mink">
                  who started with the same goal: spend less time scrolling and more time living.
                </Text>
              </View>

              <View className="mt-7 gap-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.name} {...review} />
                ))}
              </View>
            </View>

            <Button label="I’m next" onPress={() => setStep(2)} />
          </View>
        ) : (
          <View className="flex-1">
            <Text className="text-base font-bold leading-6 text-mink">
              {choosingApps
                ? 'Now, let’s find what’s eating your time.'
                : 'Take a second to reflect on those apps.'}
            </Text>
            <Text className="mt-1 text-[31px] font-black leading-[35px] tracking-[-1px] text-cocoa">
              {choosingApps
                ? 'Which apps are taking most of your time?'
                : 'What usually makes it hard to quit?'}
            </Text>
            <Text className="mt-2 text-sm font-bold text-mink">Choose up to 3</Text>

            {!choosingApps ? (
              <View className="my-5 items-center">
                <LinearGradient
                  colors={[colors.raspberry, colors.cherry]}
                  className="h-20 w-20 rotate-45 items-center justify-center rounded-[24px]"
                  style={shadow}
                >
                  <Infinity
                    size={34}
                    stroke={colors.white}
                    strokeWidth={2.4}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </LinearGradient>
              </View>
            ) : null}

            <ScrollView
              className={choosingApps ? 'mt-5 flex-1' : 'flex-1'}
              contentContainerStyle={{ gap: 11, paddingBottom: 18 }}
              showsVerticalScrollIndicator={false}
            >
              {choices.map((choice) => (
                <ChoiceRow
                  key={choice.label}
                  choice={choice}
                  selected={selected.includes(choice.label)}
                  onPress={() =>
                    choosingApps
                      ? toggle(choice.label, selectedApps, setSelectedApps)
                      : toggle(choice.label, selectedReasons, setSelectedReasons)
                  }
                />
              ))}
            </ScrollView>

            <View className="pt-3">
              <Button
                label="Continue"
                disabled={selected.length === 0}
                onPress={() => {
                  if (choosingApps) {
                    setStep(3);
                  } else {
                    router.push('/onboarding/screentime');
                  }
                }}
              />
            </View>
          </View>
        )}
      </SlidePanel>
    </Screen>
  );
}
