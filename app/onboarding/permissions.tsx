import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePostHog } from 'posthog-react-native';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { StarsBackground } from '../../components/StarsBackground';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';

function PermissionArtwork({ height }: { height: number }) {
  return (
    <View
      className="w-full"
      style={{ height }}
    >
      <Image
        source={require('../../assets/onboarding/slide-two.jpg')}
        accessibilityLabel="Bootyblock onboarding artwork"
        resizeMode="contain"
        style={styles.artworkImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artworkImage: {
    height: '100%',
    width: '100%',
  },
});

export default function Permissions() {
  const { height } = useWindowDimensions();
  const posthog = usePostHog();
  const artworkHeight = Math.min(570, Math.max(330, height - 360));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/permissions',
    ONBOARDING_STEPS.understandingSituation.key,
    ONBOARDING_STEPS.understandingSituation.title,
    ONBOARDING_STEPS.understandingSituation.index,
    ONBOARDING_STEP_TOTAL,
  );

  return (
    <Screen scroll={false} flush backgroundColor="#000000">
      <StatusBar style="light" animated />
      <View className="flex-1 bg-black px-6 pb-6 pt-3">
        <StarsBackground />
        <OnboardingProgress step={1} onBack={() => router.back()} showBar={false} />

        <SlidePanel>
          <View className="flex-1 justify-between">
            <View>
              <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
                Understanding more{'\n'}
                <Text className="text-raspberry">about your situation</Text>
              </Text>
            </View>

            <PermissionArtwork height={artworkHeight} />

            <View>
              <Text className="px-2 text-center text-base font-bold leading-6 text-white">
                We’ll use your answers to shape a Bootyblock plan that fits your goals.
              </Text>

              <View className="pt-5">
                <Button
                  label="Start Quiz"
                  onPress={() => router.push('/onboarding/quiz')}
                />
              </View>
            </View>
          </View>
        </SlidePanel>
      </View>
    </Screen>
  );
}
