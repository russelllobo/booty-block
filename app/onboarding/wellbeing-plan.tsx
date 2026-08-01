import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Heart, Quote, Star } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';

import { Button } from '../../components/Button';
import { BrandLogo } from '../../components/BrandLogo';
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
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const gold = '#FFD76A';

type PlanItem = {
  emoji: string;
  title: string;
  body: string;
};

function FadeInStage({ children, delay }: { children: ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);

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

function TimelineCard({
  day,
  title,
  body,
  emoji,
  highlighted = false,
}: PlanItem & {
  day: string;
  highlighted?: boolean;
}) {
  return (
    <View
      className={[
        'mb-4 flex-row items-start gap-3 rounded-[20px] border px-4 py-4',
        highlighted ? 'border-cyan-700/30 bg-cyan-50/80' : 'border-cocoa/10 bg-white/70',
      ].join(' ')}
    >
      <Text className="w-9 pt-0.5 text-center text-[26px] leading-8">{emoji}</Text>
      <View className="flex-1">
        <Text className="text-[15px] font-black leading-5 text-cocoa">
          {day} - {title}
        </Text>
        <Text className="mt-1 text-[14px] font-bold leading-5 text-mink">{body}</Text>
      </View>
    </View>
  );
}

export default function WellbeingPlan() {
  const posthog = usePostHog();
  const {
    completeOnboarding,
    requestOnboardingSubscriptionAccess,
  } = useBootyblock();
  const [starting, setStarting] = useState(false);

  function back() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/onboarding/notifications');
  }

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/wellbeing-plan',
    ONBOARDING_STEPS.firstWeekWellbeingPlan.key,
    ONBOARDING_STEPS.firstWeekWellbeingPlan.title,
    ONBOARDING_STEPS.firstWeekWellbeingPlan.index,
    ONBOARDING_STEP_TOTAL,
  );

  async function startBuilding() {
    if (starting) return;

    setStarting(true);
    try {
      const subscriptionStatus = await requestOnboardingSubscriptionAccess();
      if (subscriptionStatus === 'unavailable') return;

      await completeOnboarding();
      router.replace({ pathname: '/(tabs)', params: { onboardingArrival: '1' } });
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <StatusBar style="dark" animated />
      <OnboardingProgress
        step={ONBOARDING_STEPS.firstWeekWellbeingPlan.index}
        onBack={back}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <FadeInStage delay={0}>
              <View className="items-center">
                <BrandLogo height={72} label="bootyblock logo" />

                <View className="mt-4 flex-row items-center justify-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} size={18} stroke={gold} fill={gold} strokeWidth={2.4} />
                  ))}
                </View>

                <Text className="mt-5 text-center text-[31px] font-black leading-[36px] text-cocoa">
                  it’s not about finding more time to work out
                </Text>
                <Text className="mt-5 text-left text-[15px] font-semibold leading-[22px] text-mink">
                  <Text className="font-black text-cocoa">
                    it’s about turning your screen time into glute time.{' '}
                  </Text>
                  glutes grow through consistent resistance. bootyblock builds those reps into
                  something you already do every day. those small sets add up, helping you build
                  stronger, fuller glutes before you know it.
                </Text>
                <Text className="mt-5 self-stretch text-left text-[17px] font-semibold leading-6 text-mink">
                  here's what your first seven days looks like:
                </Text>
              </View>
            </FadeInStage>

            <FadeInStage delay={240}>
              <View className="mt-5">
                <TimelineCard
                  day="day 1"
                  title="pause added"
                  body="when the urge hits, bootyblock makes you move before the feed opens."
                  emoji="⏱️"
                />
                <TimelineCard
                  day="day 2"
                  title="booty reps begin"
                  body="short squat sets add a satisfying little win where automatic scrolling used to be."
                  emoji="🏋️‍♀️"
                />
                <TimelineCard
                  day="mid-week"
                  title="mood and focus lift"
                  body="less feed fog, more agency. you choose when to scroll, and your body gets the credit."
                  emoji="🧠"
                  highlighted
                />
                <TimelineCard
                  day="day 5"
                  title="booty size increases"
                  body="consistent squat sets start waking up your glutes, helping your booty feel fuller and stronger."
                  emoji="🍑"
                />
                <TimelineCard
                  day="day 7"
                  title="stronger control"
                  body="your routine starts feeling less like restriction and more like a confident reset."
                  emoji="🏆"
                />
              </View>
            </FadeInStage>

            <FadeInStage delay={680}>
              <View style={styles.sectionDivider} />
            </FadeInStage>

            <FadeInStage delay={720}>
              <View className="mt-7 rounded-[24px] border border-cocoa/10 bg-white/70 px-5 py-5">
                <Text className="text-center text-[18px] font-black leading-6 text-cocoa">
                  join the girls choosing a better body-scroll balance
                </Text>
                <View className="mt-4 rounded-[20px] border border-cocoa/10 bg-petal/35 px-4 py-4">
                  <Quote size={22} stroke={colors.bubble} strokeWidth={2.4} />
                  <Text className="mt-2 text-sm font-bold leading-5 text-cocoa">
                    a week in, i was scrolling less at night and actually felt proud of the movement
                    i did.
                  </Text>
                  <View className="mt-3 flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-petal">
                      <Heart size={15} stroke={colors.raspberry} fill={colors.petal} strokeWidth={2.5} />
                    </View>
                    <Text className="text-[13px] font-black text-cocoa">georgia r.</Text>
                    <View className="h-1 w-1 rounded-full bg-cocoa/30" />
                    <Text className="text-[13px] font-bold text-mink">bootyblock member</Text>
                  </View>
                </View>
              </View>
            </FadeInStage>

            <View className="h-5" />
          </ScrollView>

          <View className="border-t border-cocoa/10 bg-white/45 pt-3">
            <Button
              label="join bootyblock"
              loading={starting}
              disabled={starting}
              onPress={() => void startBuilding()}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
    paddingTop: 8,
  },
  sectionDivider: {
    alignSelf: 'center',
    backgroundColor: 'rgba(58, 31, 44, 0.14)',
    height: 1,
    marginTop: 24,
    width: '74%',
  },
});
