import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Activity, Brain, Dumbbell, Sparkles } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';

const background = '#07070A';
const gradient = ['#3A0F26', '#07070A'] as const;
const cyan = '#8CF6FF';
const ringSize = 196;
const strokeWidth = 10;
const radius = (ringSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

type IconType = ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;

function FadeInStage({ children, delay }: { children: ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(16);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 560,
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

function PulsingGlow() {
  const opacity = useRef(new Animated.Value(0.16)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.32, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.16, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: 'rgba(255, 143, 190, 0.22)',
          borderRadius: ringSize / 2,
        },
      ]}
    />
  );
}

export default function CalculatingPlan() {
  const posthog = usePostHog();
  const [progress, setProgress] = useState(8);
  const status = useMemo(() => {
    if (progress < 34) return 'Understanding your goals';
    if (progress < 68) return 'Balancing booty and screen time';
    return 'Building your first-week glow-up';
  }, [progress]);
  const StatusIcon: IconType = progress < 34 ? Brain : progress < 68 ? Activity : Dumbbell;
  const dashOffset = circumference - (circumference * progress) / 100;

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/calculating',
    ONBOARDING_STEPS.calculatingWellbeingPlan.key,
    ONBOARDING_STEPS.calculatingWellbeingPlan.title,
    ONBOARDING_STEPS.calculatingWellbeingPlan.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((current) => Math.min(100, current + 6));
    }, 145);
    const routeTimer = setTimeout(() => {
      router.replace('/onboarding/wellbeing-plan');
    }, 2600);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(routeTimer);
    };
  }, []);

  return (
    <Screen scroll={false} backgroundColor={background} backgroundGradient={gradient}>
      <StatusBar style="light" animated />
      <OnboardingProgress step={26} onBack={() => router.back()} showBar={false} dark />

      <SlidePanel>
        <View className="flex-1 items-center justify-center pb-10">
          <View className="items-center">
            <FadeInStage delay={0}>
              <View className="mb-6 h-[84px] w-[84px] items-center justify-center">
                <Image
                  source={require('../../assets/logo.png')}
                  accessibilityLabel="Bootyblock logo"
                  resizeMode="contain"
                  style={{ width: 84, height: 84 }}
                />
              </View>
            </FadeInStage>

            <FadeInStage delay={120}>
              <View className="flex-row items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                <Sparkles size={16} stroke={colors.bubble} strokeWidth={2.6} />
                <Text className="text-xs font-black uppercase text-white">
                  Personalizing your plan
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={240}>
              <View style={styles.copyBlock}>
                <Text style={styles.headline}>Forming your booty plan</Text>
                <Text style={styles.bodyCopy}>
                  Turning your answers into a screen-time reset with a booty-first routine.
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={420}>
              <View className="mt-8 items-center justify-center" style={styles.ringFrame}>
                <PulsingGlow />
                <Svg height={ringSize} width={ringSize} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor={colors.bubble} />
                      <Stop offset="100%" stopColor={cyan} />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    stroke="url(#ringGradient)"
                    strokeLinecap="round"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>
                <View className="items-center">
                  <Text style={styles.percentage}>
                    <Text style={styles.percentageNumber}>{progress}</Text>
                    <Text style={styles.percentageSign}>%</Text>
                  </Text>
                </View>
              </View>
            </FadeInStage>

            <FadeInStage delay={620}>
              <View style={styles.statusPill}>
                <StatusIcon size={18} stroke={cyan} strokeWidth={2.6} />
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </FadeInStage>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copyBlock: {
    width: 306,
    maxWidth: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  headline: {
    maxWidth: 286,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.white,
    includeFontPadding: false,
  },
  bodyCopy: {
    maxWidth: 282,
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.white,
    includeFontPadding: false,
  },
  ringFrame: {
    height: ringSize,
    width: ringSize,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 306,
    maxWidth: '100%',
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.white,
    includeFontPadding: false,
  },
  percentage: {
    textAlign: 'center',
    lineHeight: 48,
    includeFontPadding: false,
  },
  percentageNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.white,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  percentageSign: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.white,
    includeFontPadding: false,
  },
});
