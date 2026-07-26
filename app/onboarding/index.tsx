import { router } from 'expo-router';
import { ArrowRight, Lock } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { StoryPager, StoryPagerHandle } from '../../components/StoryPager';
import { colors, shadow } from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';

const SQUATTING_DEMO_ASPECT_RATIO = 394 / 648;
const squattingDemo = require('../../assets/onboarding/squatting-cut.gif');
const squattingPoster = require('../../assets/onboarding/squatting-poster.jpg');

const appIcons = [
  {
    key: 'instagram',
    label: 'Instagram',
    source: require('../../assets/onboarding/app-icons/instagram.png'),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    source: require('../../assets/onboarding/app-icons/tiktok.png'),
  },
  {
    key: 'snapchat',
    label: 'Snapchat',
    source: require('../../assets/onboarding/app-icons/snapchat.png'),
  },
  {
    key: 'x',
    label: 'X',
    source: require('../../assets/onboarding/app-icons/x.png'),
  },
] as const;

const storySteps = [
  ONBOARDING_STEPS.doomscrollingProblem,
  ONBOARDING_STEPS.squatTimeSolution,
  ONBOARDING_STEPS.unlockAppsExplainer,
] as const;

export default function OnboardingStory() {
  const { height } = useWindowDimensions();
  const posthog = usePostHog();
  const [step, setStep] = useState(0);
  const [appsUnlocked, setAppsUnlocked] = useState(false);
  const [isSimpleFlowComplete, setIsSimpleFlowComplete] = useState(false);
  const pagerRef = useRef<StoryPagerHandle>(null);
  const simpleProgress = useRef(new Animated.Value(0)).current;
  const blockedCopyProgress = useRef(new Animated.Value(0)).current;
  const iconProgress = useRef(appIcons.map(() => new Animated.Value(0))).current;
  const blockedOutProgress = useRef(new Animated.Value(0)).current;
  const doSquatsProgress = useRef(new Animated.Value(0)).current;
  const unlockAppsProgress = useRef(new Animated.Value(0)).current;
  const demoProgress = useRef(new Animated.Value(0)).current;
  const appColorProgress = useRef(new Animated.Value(0)).current;
  const analyticsStep = storySteps[step];
  const contentTopPadding = Math.min(110, Math.max(72, height * 0.105));
  const demoHeight = Math.min(350, Math.max(280, height * 0.38));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding',
    analyticsStep.key,
    analyticsStep.title,
    analyticsStep.index,
    ONBOARDING_STEP_TOTAL,
  );

  useEffect(() => {
    if (step !== storySteps.length - 1) return;

    setAppsUnlocked(false);
    setIsSimpleFlowComplete(false);
    simpleProgress.setValue(0);
    blockedCopyProgress.setValue(0);
    iconProgress.forEach((progress) => progress.setValue(0));
    blockedOutProgress.setValue(0);
    doSquatsProgress.setValue(0);
    unlockAppsProgress.setValue(0);
    demoProgress.setValue(0);
    appColorProgress.setValue(0);

    const introAnimation = Animated.sequence([
      Animated.timing(simpleProgress, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.delay(180),
      Animated.timing(blockedCopyProgress, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(180),
      Animated.stagger(
        180,
        iconProgress.map((progress) =>
          Animated.timing(progress, {
            toValue: 1,
            duration: 340,
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.delay(700),
      Animated.timing(blockedOutProgress, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
    ]);

    let resolutionAnimation: ReturnType<typeof Animated.sequence> | undefined;
    let colorAnimation: ReturnType<typeof Animated.timing> | undefined;
    let demoAnimation: ReturnType<typeof Animated.timing> | undefined;

    introAnimation.start(({ finished }) => {
      if (!finished) return;

      resolutionAnimation = Animated.sequence([
        Animated.timing(doSquatsProgress, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.delay(180),
        Animated.timing(unlockAppsProgress, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.delay(260),
      ]);

      resolutionAnimation.start(({ finished: resolutionFinished }) => {
        if (!resolutionFinished) return;

        colorAnimation = Animated.timing(appColorProgress, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        });
        colorAnimation.start(({ finished: colorFinished }) => {
          if (!colorFinished) return;

          setAppsUnlocked(true);
          demoAnimation = Animated.timing(demoProgress, {
            toValue: 1,
            duration: 560,
            useNativeDriver: true,
          });
          demoAnimation.start(({ finished: demoFinished }) => {
            if (demoFinished) {
              setIsSimpleFlowComplete(true);
            }
          });
        });
      });
    });

    return () => {
      introAnimation.stop();
      resolutionAnimation?.stop();
      colorAnimation?.stop();
      demoAnimation?.stop();
    };
  }, [
    appColorProgress,
    blockedOutProgress,
    blockedCopyProgress,
    demoProgress,
    doSquatsProgress,
    iconProgress,
    simpleProgress,
    step,
    unlockAppsProgress,
  ]);

  const handleContinue = useCallback(() => {
    if (step < storySteps.length - 1) {
      pagerRef.current?.setPage(step + 1);
      return;
    }

    router.push('/onboarding/quiz');
  }, [step]);

  const handlePageSelected = useCallback((page: number) => {
    setStep(page);
  }, []);

  return (
    <Screen scroll={false}>
      <View style={styles.page}>
        <StoryPager
          ref={pagerRef}
          onPageSelected={handlePageSelected}
          style={styles.pager}
        >
          <View key={storySteps[0].key} style={styles.pagerPage}>
            <View style={[styles.slide, { paddingTop: contentTopPadding }]}>
              <Text style={styles.headline}>
                {'social media addiction is taking you away from '}
                <Text style={styles.highlight}>the body you want</Text>
              </Text>
            </View>
          </View>

          <View key={storySteps[1].key} style={styles.pagerPage}>
            <View style={[styles.slide, { paddingTop: contentTopPadding }]}>
              <Text style={styles.headline}>
                <Text style={styles.highlight}>BootyBlock</Text>
                {' helps you turn screen time into '}
                <Text style={styles.highlight}>Squat Time.</Text>
              </Text>
            </View>
          </View>

          <View key={storySteps[2].key} style={styles.pagerPage}>
            <View style={[styles.slide, { paddingTop: contentTopPadding }]}>
              <View style={styles.headlineStage}>
                <Animated.View
                  style={[
                    styles.simpleHeadline,
                    {
                      opacity: simpleProgress,
                      transform: [
                        {
                          translateY: simpleProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.headline}>
                    {"it's "}
                    <Text style={styles.highlight}>simple.</Text>
                  </Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.variableHeadline,
                    {
                      opacity: blockedCopyProgress,
                      transform: [
                        {
                          translateY: blockedCopyProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Animated.View
                    style={{
                      opacity: blockedOutProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    }}
                  >
                    <Text style={styles.headline}>
                      {'your addictive apps are '}
                      <Text style={styles.highlight}>blocked.</Text>
                    </Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.replacementHeadline,
                      {
                        opacity: doSquatsProgress,
                        transform: [
                          {
                            translateY: doSquatsProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [10, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.headline}>
                      {'do your squats,'}
                    </Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.unlockAppsHeadline,
                      {
                        opacity: unlockAppsProgress,
                        transform: [
                          {
                            translateY: unlockAppsProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [10, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={[styles.headline, styles.highlight]}>
                      unlock your apps.
                    </Text>
                  </Animated.View>
                </Animated.View>
              </View>

              <View style={styles.storyStage}>
                <Animated.View
                  style={[
                    styles.demoFrame,
                    { aspectRatio: SQUATTING_DEMO_ASPECT_RATIO, height: demoHeight },
                    {
                      opacity: demoProgress,
                      transform: [
                        {
                          scale: demoProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.96, 1],
                          }),
                        },
                        {
                          translateY: demoProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [18, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={squattingPoster}
                    accessibilityLabel="Squat demo"
                    resizeMode="contain"
                    style={styles.demoImage}
                  />
                  <Image
                    source={squattingDemo}
                    accessibilityLabel="Squat demo animation"
                    resizeMode="contain"
                    style={[styles.demoImage, styles.demoAnimation]}
                  />
                </Animated.View>

                <View style={styles.appRow}>
                {appIcons.map((app, index) => (
                  <Animated.View
                    key={app.key}
                    style={[
                      styles.appIconFrame,
                      {
                        opacity: iconProgress[index],
                        transform: [
                          {
                            translateY: iconProgress[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [12, 0],
                            }),
                          },
                          {
                            scale: iconProgress[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.9, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.appImageStage,
                        {
                          opacity: appColorProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.32, 1],
                          }),
                        },
                      ]}
                    >
                      <Image
                        source={app.source}
                        accessibilityLabel={`${app.label}, ${
                          appsUnlocked ? 'unlocked' : 'locked'
                        }`}
                        style={styles.appIcon}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.appMutedOverlay,
                          {
                            opacity: appColorProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.68, 0],
                            }),
                          },
                        ]}
                      />
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.appLockBadge,
                        {
                          opacity: appColorProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          }),
                          transform: [
                            {
                              scale: appColorProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0.7],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Lock size={12} color={colors.white} strokeWidth={3} />
                    </Animated.View>
                  </Animated.View>
                ))}
                </View>
              </View>
            </View>
          </View>
        </StoryPager>

        <View style={styles.buttonArea}>
          <Button
            label={step === storySteps.length - 1 ? 'start building my glutes' : 'continue'}
            icon={ArrowRight}
            iconPosition="right"
            forceGlass
            animateDisabledFade
            disabled={step === storySteps.length - 1 && !isSimpleFlowComplete}
            onPress={handleContinue}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    borderRadius: 17,
    height: 70,
    width: 70,
  },
  appIconFrame: {
    borderRadius: 20,
    padding: 4,
    position: 'relative',
  },
  appImageStage: {
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
  },
  appRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  appLockBadge: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    bottom: -1,
    height: 25,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    width: 25,
  },
  appMutedOverlay: {
    backgroundColor: '#8C888A',
    borderRadius: 17,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  buttonArea: {
    minHeight: 76,
    paddingTop: 14,
  },
  demoAnimation: {
    position: 'absolute',
  },
  demoFrame: {
    alignSelf: 'center',
    borderRadius: 34,
    overflow: 'hidden',
    position: 'absolute',
    top: 98,
    ...shadow,
  },
  demoImage: {
    height: '100%',
    width: '100%',
  },
  headline: {
    color: colors.cocoa,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 35,
  },
  simpleHeadline: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headlineStage: {
    height: 112,
    position: 'relative',
  },
  highlight: {
    color: colors.raspberry,
  },
  page: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
  replacementHeadline: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  slide: {
    flex: 1,
    gap: 14,
  },
  storyStage: {
    flex: 1,
    position: 'relative',
  },
  unlockAppsHeadline: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 35,
  },
  variableHeadline: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 35,
  },
});
