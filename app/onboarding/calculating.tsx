import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePostHog } from 'posthog-react-native';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../../components/AppText';

import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import {
  colors,
  onboardingLightBackground,
  onboardingLightGradient,
} from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';

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
  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/calculating',
    ONBOARDING_STEPS.calculatingWellbeingPlan.key,
    ONBOARDING_STEPS.calculatingWellbeingPlan.title,
    ONBOARDING_STEPS.calculatingWellbeingPlan.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 2200,
      easing: Easing.linear,
    });
    const timer = setTimeout(() => {
      router.replace('/onboarding/wellbeing-plan');
    }, 2350);

    return () => {
      cancelAnimation(progress);
      clearTimeout(timer);
    };
  }, [progress]);

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <StatusBar style="dark" animated />
      <OnboardingProgress
        step={ONBOARDING_STEPS.calculatingWellbeingPlan.index}
        onBack={() => router.back()}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1 items-center px-9 pb-1 pt-1" style={{ paddingTop: 104 }}>
          <View className="items-center">
            <FadeInStage delay={0}>
              <View className="items-center">
                <View className="h-[120px] w-[120px] items-center justify-center">
                  <Image
                    source={require('../../assets/logo.png')}
                    accessibilityLabel="bootyblock logo"
                    resizeMode="contain"
                    style={{ width: 112, height: 112 }}
                  />
                </View>

                <Text
                  className="mt-9 text-center text-[30px] font-bold leading-[35px]"
                  style={{ color: colors.cocoa }}
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
                backgroundColor: 'rgba(233, 30, 115, 0.16)',
              }}
            >
              <Reanimated.View
                style={[
                  {
                    position: 'absolute',
                    height: '100%',
                    width: '100%',
                    borderRadius: 999,
                    backgroundColor: colors.raspberry,
                    transformOrigin: 'left center',
                  },
                  progressStyle,
                ]}
              />
            </View>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
