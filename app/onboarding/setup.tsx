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
import {
  colors,
  onboardingLightBackground,
  onboardingLightGradient,
  shadow,
} from '../../constants/theme';
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
    title: 'put your phone on the floor',
    body: 'face the camera toward you in a well-lit area so bootyblock can see your full body.',
    media: 'phone',
  },
  {
    analyticsStep: ONBOARDING_STEPS.setupSquat,
    title: 'step back and squat',
    body: 'keep your whole body in frame, then do one clean squat to finish calibration.',
    media: 'squat',
  },
  {
    analyticsStep: ONBOARDING_STEPS.setupTips,
    title: 'tips for better detection',
  },
];

const setupMedia = {
  phone: require('../../assets/onboarding/position-phone-floor.gif'),
  squat: require('../../assets/onboarding/position-step-back-squat.gif'),
};

const tips: Tip[] = [
  { icon: Smartphone, text: 'make sure your whole body is fully in frame.' },
  { icon: Lightbulb, text: 'make sure the background is clear and well-lit.' },
  { icon: Shirt, text: 'tuck in shirts and pants that are too baggy.' },
];

function SetupMedia({ type, height }: { type: NonNullable<SetupSlide['media']>; height: number }) {
  return (
    <View
      className="overflow-hidden rounded-[34px] border border-cocoa/10 bg-white/75"
      style={[{ alignSelf: 'center', aspectRatio: 420 / 747, height }, shadow]}
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
        <View key={text} className="flex-row items-center gap-4 rounded-[24px] border border-cocoa/10 bg-white/70 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-petal/70">
            <Icon size={25} stroke={colors.raspberry} strokeWidth={2.4} />
          </View>
          <Text className="flex-1 text-base font-bold leading-5 text-cocoa">{text}</Text>
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
  const [introFinished, setIntroFinished] = useState(initialStep !== 0);
  const introEntranceX = useRef(new Animated.Value(initialStep === 0 ? 72 : 0)).current;
  const introTitleProgress = useRef(new Animated.Value(initialStep === 0 ? 0 : 1)).current;
  const introContentProgress = useRef(new Animated.Value(initialStep === 0 ? 0 : 1)).current;
  const posthog = usePostHog();
  const { height } = useWindowDimensions();
  const direction = useStepDirection(step);
  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const mediaHeight = Math.min(470, Math.max(300, height * 0.56));
  const tipsHeight = Math.min(430, Math.max(270, height * 0.48));
  const isIntroSlide = step === 0;
  const introTitleOffset = Math.max(190, height * 0.34);

  useEffect(() => {
    if (!isIntroSlide) {
      introEntranceX.setValue(0);
      introTitleProgress.setValue(1);
      introContentProgress.setValue(1);
      setIntroFinished(true);
      return;
    }

    introEntranceX.setValue(72);
    introTitleProgress.setValue(0);
    introContentProgress.setValue(0);
    setIntroFinished(false);

    const entranceAnimation = Animated.timing(introEntranceX, {
      toValue: 0,
      duration: 440,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const animation = Animated.sequence([
      Animated.delay(900),
      Animated.timing(introTitleProgress, {
        toValue: 1,
        duration: 560,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introContentProgress, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start();
    animation.start(({ finished }) => {
      if (finished) setIntroFinished(true);
    });

    return () => {
      entranceAnimation.stop();
      animation.stop();
    };
  }, [introContentProgress, introEntranceX, introTitleProgress, isIntroSlide]);

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
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <StatusBar style="dark" animated />
      <Animated.View
        pointerEvents={introFinished ? 'auto' : 'none'}
        style={{ opacity: isIntroSlide ? introContentProgress : 1 }}
      >
        <OnboardingProgress step={slide.analyticsStep.index} onBack={back} />
      </Animated.View>

      <SlidePanel stepKey={step} direction={direction} animateOnMount>
        <View className="flex-1">
          <Animated.View
            className="mb-4"
            style={{
              transform: [
                { translateX: introEntranceX },
                {
                  translateY: introTitleProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [isIntroSlide ? introTitleOffset : 0, 0],
                  }),
                },
              ],
            }}
          >
            {slide.eyebrow ? (
              <Animated.View style={{ opacity: isIntroSlide ? introContentProgress : 1 }}>
                <Text className="text-center text-sm font-black uppercase tracking-[2px] text-mink">
                  {slide.eyebrow}
                </Text>
              </Animated.View>
            ) : null}

            <View className="mt-1 h-[33px]">
              {isIntroSlide ? (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: introTitleProgress.interpolate({
                        inputRange: [0, 0.52, 0.78, 1],
                        outputRange: [1, 1, 0, 0],
                      }),
                    },
                  ]}
                >
                  <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">
                    lets try
                  </Text>
                </Animated.View>
              ) : null}

              <Animated.View
                style={{
                  opacity: isIntroSlide
                    ? introTitleProgress.interpolate({
                        inputRange: [0, 0.52, 0.82, 1],
                        outputRange: [0, 0, 1, 1],
                      })
                    : 1,
                }}
              >
                <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">
                  {slide.title}
                </Text>
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View
            className="flex-1"
            pointerEvents={introFinished ? 'auto' : 'none'}
            style={{
              flex: 1,
              opacity: isIntroSlide ? introContentProgress : 1,
              transform: [
                {
                  translateY: isIntroSlide
                    ? introContentProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      })
                    : 0,
                },
              ],
            }}
          >
            <View className={slide.media ? 'flex-1 items-center pt-5' : 'flex-1 justify-center'}>
              <DemoStage stepKey={step} direction={direction}>
                {slide.media === 'phone' ? (
                  <SetupMedia type="phone" height={mediaHeight} />
                ) : slide.media === 'squat' ? (
                  <SetupMedia type="squat" height={mediaHeight} />
                ) : (
                  <TipsPanel height={tipsHeight} />
                )}
              </DemoStage>
            </View>

            <Text className="mb-4 px-4 text-center text-base font-semibold leading-6 text-mink">
              {slide.body}
            </Text>
          </Animated.View>

          <View
            className="pt-4"
            pointerEvents={introFinished ? 'auto' : 'none'}
          >
            {introFinished ? (
              <Button
                label={isLast ? 'continue' : 'next'}
                icon={isLast ? CheckCircle2 : ArrowRight}
                onPress={next}
              />
            ) : (
              <View style={{ minHeight: 56 }} />
            )}
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
