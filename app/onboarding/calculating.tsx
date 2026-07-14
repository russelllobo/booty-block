import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePostHog } from 'posthog-react-native';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { Text } from '../../components/AppText';

import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';

const background = '#07070A';
const gradient = ['#3A0F26', '#07070A'] as const;

function FadeInStage({ children, delay }: { children: ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function CalculatingPlan() {
  const posthog = usePostHog();
  const progress = useRef(new Animated.Value(0)).current;

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/calculating',
    ONBOARDING_STEPS.calculatingWellbeingPlan.key,
    ONBOARDING_STEPS.calculatingWellbeingPlan.title,
    ONBOARDING_STEPS.calculatingWellbeingPlan.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    progress.setValue(0);

    const progressAnimation = Animated.sequence([
      Animated.timing(progress, {
        toValue: 0.18,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(180),
      Animated.timing(progress, {
        toValue: 0.46,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(260),
      Animated.timing(progress, {
        toValue: 0.72,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(220),
      Animated.timing(progress, {
        toValue: 0.88,
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(160),
      Animated.timing(progress, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    const timer = setTimeout(() => {
      router.replace('/onboarding/wellbeing-plan');
    }, 2350);

    progressAnimation.start();

    return () => {
      progressAnimation.stop();
      clearTimeout(timer);
    };
  }, [progress]);

  return (
    <Screen scroll={false} backgroundColor={background} backgroundGradient={gradient}>
      <StatusBar style="light" animated />
      <OnboardingProgress step={26} onBack={() => router.back()} showBar={false} dark />

      <SlidePanel animateOnMount>
        <View className="flex-1 items-center px-9 pb-1 pt-1" style={{ paddingTop: 104 }}>
          <View className="items-center">
            <FadeInStage delay={0}>
              <View className="items-center">
                <View className="h-[120px] w-[120px] items-center justify-center">
                  <Image
                    source={require('../../assets/logo.png')}
                    accessibilityLabel="Bootyblock logo"
                    resizeMode="contain"
                    style={{ width: 112, height: 112 }}
                  />
                </View>

                <Text
                  className="mt-9 text-center text-[30px] font-black leading-[35px]"
                  style={{ color: colors.white }}
                >
                  Forming your booty plan
                </Text>
              </View>
            </FadeInStage>

            <View
              style={{
                width: 260,
                maxWidth: '100%',
                height: 12,
                marginTop: 22,
                borderRadius: 999,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.42)',
              }}
            >
              <Animated.View
                style={{
                  height: '100%',
                  borderRadius: 999,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: colors.white,
                }}
              />
            </View>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
