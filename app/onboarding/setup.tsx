import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight, CheckCircle2, Lightbulb, Shirt, Smartphone, } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../../components/AppText';

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

const setupBackground = '#07070A';
const setupGradient = ['#3A0F26', '#07070A'] as const;

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
      className="overflow-hidden rounded-[34px] border border-white/15 bg-black"
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
        <View key={text} className="flex-row items-center gap-4 rounded-[24px] border border-white/10 bg-white/10 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/12">
            <Icon size={25} stroke={colors.raspberry} strokeWidth={2.4} />
          </View>
          <Text className="flex-1 text-base font-bold leading-5 text-white">{text}</Text>
        </View>
      ))}
    </View>
  );
}

function DemoStage({
  children,
  direction,
  stepKey,
}: {
  children: ReactNode;
  direction: 'forward' | 'back';
  stepKey: number;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const firstStep = useRef(true);

  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }

    opacity.setValue(0);
    translateY.setValue(direction === 'back' ? -18 : 18);
    scale.setValue(0.97);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 280,
        damping: 26,
        mass: 0.85,
      }),
    ]).start();
  }, [direction, opacity, scale, stepKey, translateY]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }, { scale }] }}
    >
      {children}
    </Animated.View>
  );
}

export default function Setup() {
  const { previewStep } = useLocalSearchParams<{ previewStep?: string }>();
  const parsedPreviewStep = Number(previewStep);
  const initialStep =
    Number.isInteger(parsedPreviewStep) && parsedPreviewStep >= 0 && parsedPreviewStep < slides.length
      ? parsedPreviewStep
      : 0;
  const [step, setStep] = useState(initialStep);
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
    <Screen scroll={false} backgroundColor={setupBackground} backgroundGradient={setupGradient}>
      <StatusBar style="light" animated />
      <OnboardingProgress step={slide.analyticsStep.index} onBack={back} dark />

      <SlidePanel stepKey={step} direction={direction} animateOnMount>
        <View className="flex-1">
          <View className="mb-4">
            {slide.eyebrow ? (
              <Text className="text-center text-sm font-black uppercase tracking-[2px] text-white/50">
                {slide.eyebrow}
              </Text>
            ) : null}
            <Text className="mt-1 text-center text-[28px] font-bold leading-[33px] text-white">
              {slide.title}
            </Text>
          </View>

          <View className="flex-1 justify-center">
            <DemoStage stepKey={step} direction={direction}>
              {slide.media === 'phone' ? (
                <SetupMedia type="phone" height={mediaHeight} />
              ) : slide.media === 'squat' ? (
                <SetupMedia type="squat" height={mediaHeight} />
              ) : (
                <TipsPanel height={mediaHeight} />
              )}
            </DemoStage>
          </View>

          <View className="pt-5">
            <Text className="mb-4 px-4 text-center text-base font-semibold leading-6 text-white/60">
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
