import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { View } from 'react-native';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import {
  onboardingLightBackground,
  onboardingLightGradient,
} from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function FinishSetup() {
  const { profileName } = useBootyblock();
  const posthog = usePostHog();
  const firstName = profileName.trim().split(/\s+/)[0];
  const headline = firstName
    ? `${firstName}, let’s finish setting up bootyblock to help you succeed.`
    : 'Let’s finish setting up bootyblock to help you succeed.';

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/finish',
    ONBOARDING_STEPS.finishSetupIntro.key,
    ONBOARDING_STEPS.finishSetupIntro.title,
    ONBOARDING_STEPS.finishSetupIntro.index,
    ONBOARDING_STEP_TOTAL,
  );

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <OnboardingProgress
        step={ONBOARDING_STEPS.finishSetupIntro.index}
        onBack={() => router.back()}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1 justify-between">
          <View />

          <View className="px-2">
            <Text className="text-center text-[28px] font-bold leading-[33px] text-cocoa">
              {headline}
            </Text>
          </View>

          <Button
            label="finish setup"
            icon={ArrowRight}
            onPress={() => router.push('/onboarding/screentime')}
          />
        </View>
      </SlidePanel>
    </Screen>
  );
}
