import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePostHog } from 'posthog-react-native';
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
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

const goldLaurelWreath = require('../../assets/onboarding/gold-laurel-wreath.png');

function ProofItem({ children, delay }: { children: ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
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

function ReviewCard({
  body,
  compact,
  title,
}: {
  body: string;
  compact: boolean;
  title: string;
}) {
  return (
    <View style={[styles.reviewCard, compact && styles.reviewCardCompact]}>
      <Text
        accessibilityLabel="5 out of 5 stars"
        style={[styles.stars, compact && styles.starsCompact]}
      >
        ★★★★★
      </Text>
      <Text style={[styles.reviewTitle, compact && styles.reviewTitleCompact]}>{title}</Text>
      <Text style={[styles.reviewBody, compact && styles.reviewBodyCompact]}>{body}</Text>
    </View>
  );
}

function WreathHalf({ compact, side }: { compact: boolean; side: 'left' | 'right' }) {
  const halfWidth = compact ? 54 : 60;
  const imageHeight = Math.round(halfWidth * 2 * (562 / 610));

  return (
    <View style={{ height: imageHeight, overflow: 'hidden', width: halfWidth }}>
      <Image
        source={goldLaurelWreath}
        accessible={false}
        accessibilityIgnoresInvertColors
        resizeMode="stretch"
        style={{
          height: imageHeight,
          left: side === 'left' ? 0 : -halfWidth,
          position: 'absolute',
          width: halfWidth * 2,
        }}
      />
    </View>
  );
}

export function SocialProofScreen({
  mode = 'onboarding',
}: {
  mode?: 'onboarding' | 'return-offer';
}) {
  const posthog = usePostHog();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const isReturnOffer = mode === 'return-offer';

  useOnboardingStepAnalytics(
    posthog,
    isReturnOffer ? '/return-offer/reviews' : '/onboarding/social-proof',
    ONBOARDING_STEPS.socialProof.key,
    ONBOARDING_STEPS.socialProof.title,
    ONBOARDING_STEPS.socialProof.index,
    ONBOARDING_STEP_TOTAL,
  );

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <StatusBar style="dark" animated />
      <OnboardingProgress
        step={ONBOARDING_STEPS.socialProof.index}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(isReturnOffer ? '/return-offer' : '/onboarding/notifications');
          }
        }}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View style={styles.screenContent}>
          <View>
            <Text style={[styles.headline, compact && styles.headlineCompact]}>
              bootyblock was designed{`\n`}for{' '}
              <Text style={styles.headlineAccent}>women like you.</Text>
            </Text>
            <Text style={[styles.supportingText, compact && styles.supportingTextCompact]}>
              reviews from people using bootyblock.
            </Text>
          </View>

          <View style={[styles.proofContent, compact && styles.proofContentCompact]}>
            <ProofItem delay={70}>
              <View style={styles.wreathRow}>
                <WreathHalf compact={compact} side="left" />
                <View style={styles.wreathCenter}>
                  <Text style={[styles.wreathText, compact && styles.wreathTextCompact]}>
                    the #1 booty{`\n`}habit app
                  </Text>
                  <Text accessibilityLabel="5 out of 5 stars" style={styles.wreathStars}>
                    ★★★★★
                  </Text>
                </View>
                <WreathHalf compact={compact} side="right" />
              </View>
              <Text accessibilityLabel="praying and raised hands" style={styles.emojiRow}>
                🙏  🙌
              </Text>
            </ProofItem>

            <View style={[styles.reviewStack, compact && styles.reviewStackCompact]}>
              <ProofItem delay={170}>
                <ReviewCard
                  compact={compact}
                  title="GAME CHANGER."
                  body="no joke, this app is the only thing that's actually helped me pray consistently. the app lock is genius."
                />
              </ProofItem>
              <ProofItem delay={270}>
                <ReviewCard
                  compact={compact}
                  title="FINALLY!!"
                  body="finally an app that gets it. i was so sick of my phone owning my mornings. now God gets the first word."
                />
              </ProofItem>
            </View>
          </View>

          <Button
            label="Join bootyblock 🙏"
            onPress={() => router.push(
              isReturnOffer ? '/return-offer/wellbeing-plan' : '/onboarding/calculating',
            )}
          />
        </View>
      </SlidePanel>
    </Screen>
  );
}

export default function SocialProof() {
  return <SocialProofScreen />;
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headline: {
    color: colors.cocoa,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 32,
  },
  headlineCompact: {
    fontSize: 25,
    lineHeight: 29,
  },
  headlineAccent: {
    color: colors.raspberry,
    fontWeight: '700',
  },
  supportingText: {
    color: colors.mink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 7,
  },
  supportingTextCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  proofContent: {
    gap: 14,
    justifyContent: 'center',
    paddingVertical: 12,
    transform: [{ translateY: -18 }],
  },
  proofContentCompact: {
    gap: 9,
    paddingVertical: 5,
    transform: [{ translateY: -8 }],
  },
  wreathRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  wreathCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wreathText: {
    color: colors.cocoa,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 21,
    marginHorizontal: 2,
    minWidth: 132,
    textAlign: 'center',
  },
  wreathTextCompact: {
    fontSize: 17,
    lineHeight: 19,
    minWidth: 120,
  },
  wreathStars: {
    color: colors.raspberry,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 18,
    marginTop: 5,
  },
  emojiRow: {
    color: colors.cocoa,
    fontSize: 19,
    lineHeight: 25,
    marginTop: 2,
    textAlign: 'center',
  },
  reviewStack: {
    gap: 13,
  },
  reviewStackCompact: {
    gap: 9,
  },
  reviewCard: {
    backgroundColor: colors.cream,
    borderColor: colors.cocoa,
    borderRadius: 15,
    borderWidth: 2,
    minHeight: 124,
    paddingHorizontal: 15,
    paddingVertical: 13,
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 0,
    elevation: 5,
  },
  reviewCardCompact: {
    minHeight: 110,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  stars: {
    color: colors.raspberry,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 20,
  },
  starsCompact: {
    fontSize: 16,
    lineHeight: 18,
  },
  reviewTitle: {
    color: colors.cocoa,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 3,
  },
  reviewTitleCompact: {
    fontSize: 15,
    lineHeight: 18,
    marginTop: 2,
  },
  reviewBody: {
    color: colors.cocoa,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 6,
  },
  reviewBodyCompact: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 4,
  },
});
