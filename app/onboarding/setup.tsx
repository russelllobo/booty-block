import { router } from 'expo-router';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Shirt,
  Smartphone,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS, OnboardingStep } from '../../lib/onboardingSteps';

type SetupSlide = {
  analyticsStep: OnboardingStep;
  eyebrow?: string;
  title: string;
  body?: string;
  media?: 'phone' | 'squat';
};

type Tip = {
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
  text: string;
};

const slides: SetupSlide[] = [
  {
    analyticsStep: ONBOARDING_STEPS.setupPhone,
    eyebrow: 'Setup',
    title: 'Put your phone on the floor',
    body: 'Face the camera toward you in a well-lit area so Bootyblock can see your full body.',
    media: 'phone',
  },
  {
    analyticsStep: ONBOARDING_STEPS.setupSquat,
    eyebrow: 'Squats',
    title: 'Step back and squat',
    body: 'Keep your whole body in frame, then do one clean squat to finish calibration.',
    media: 'squat',
  },
  {
    analyticsStep: ONBOARDING_STEPS.setupTips,
    title: 'Tips for better detection',
  },
];

const setupMedia = {
  phone: require('../../assets/onboarding/position-phone-floor.gif'),
  squat: require('../../assets/onboarding/position-step-back-squat.gif'),
};

const tips: Tip[] = [
  { icon: Smartphone, text: 'Make sure your whole body is fully in frame.' },
  { icon: Lightbulb, text: 'Make sure the background is clear and well-lit.' },
  { icon: Shirt, text: 'Tuck in shirts and pants that are too baggy.' },
];

function SetupMedia({ type, height }: { type: NonNullable<SetupSlide['media']>; height: number }) {
  return (
    <View
      className="overflow-hidden rounded-[34px] border border-white/80"
      style={[{ height }, shadow]}
    >
      <Image
        key={type}
        source={setupMedia[type]}
        accessibilityLabel={type === 'phone' ? 'Phone placement demo animation' : 'Step back and squat demo animation'}
        resizeMode="contain"
        style={styles.mediaImage}
      />
    </View>
  );
}

function TipsPanel({ height }: { height: number }) {
  return (
    <View
      className="justify-center gap-4"
      style={{ minHeight: height }}
    >
      {tips.map(({ icon: Icon, text }) => (
        <View key={text} className="flex-row items-center gap-4 rounded-[24px] bg-petal/70 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
            <Icon size={25} stroke={colors.raspberry} strokeWidth={2.4} />
          </View>
          <Text className="flex-1 text-base font-bold leading-5 text-cocoa">{text}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Setup() {
  const [step, setStep] = useState(0);
  const posthog = usePostHog();
  const { height } = useWindowDimensions();
  const direction = useStepDirection(step);
  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const mediaHeight = Math.min(430, Math.max(270, height * 0.48));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/setup',
    slide.analyticsStep.key,
    slide.analyticsStep.title,
    slide.analyticsStep.index,
    ONBOARDING_STEP_TOTAL,
  );

  function back() {
    if (step > 0) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  }

  function next() {
    if (!isLast) {
      setStep((current) => current + 1);
      return;
    }
    captureAnalytics(posthog, 'calibration_started');
    router.push('/onboarding/calibration');
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={19 + step} onBack={back} />

      <SlidePanel stepKey={step} direction={direction}>
        <View className="flex-1">
          <View className="mb-4">
            {slide.eyebrow ? (
              <Text className="text-center text-sm font-black uppercase tracking-[2px] text-raspberry">
                {slide.eyebrow}
              </Text>
            ) : null}
            <Text className="mt-1 text-center text-[28px] font-bold leading-[33px] text-cocoa">
              {slide.title}
            </Text>
          </View>

          <View className="flex-1 justify-center">
            {slide.media === 'phone' ? (
              <SetupMedia type="phone" height={mediaHeight} />
            ) : slide.media === 'squat' ? (
              <SetupMedia type="squat" height={mediaHeight} />
            ) : (
              <TipsPanel height={mediaHeight} />
            )}
          </View>

          <View className="pt-5">
            <Text className="mb-4 px-4 text-center text-base font-semibold leading-6 text-mink">
              {slide.body}
            </Text>
            <Button
              label={isLast ? 'Continue' : 'Next'}
              icon={isLast ? CheckCircle2 : ArrowRight}
              onPress={next}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mediaImage: {
    height: '100%',
    width: '100%',
  },
});
