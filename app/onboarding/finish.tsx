import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const finishBackground = '#07070A';
const finishGradient = ['#3A0F26', '#07070A'] as const;

export default function FinishSetup() {
  const { profileName } = useBootyblock();
  const firstName = profileName.trim().split(/\s+/)[0];
  const headline = firstName
    ? `${firstName}, let’s finish setting up Booty Block to help you succeed.`
    : 'Let’s finish setting up Booty Block to help you succeed.';

  return (
    <Screen
      scroll={false}
      backgroundColor={finishBackground}
      backgroundGradient={finishGradient}
    >
      <OnboardingProgress step={23} onBack={() => router.back()} showBar={false} dark />

      <SlidePanel>
        <View className="flex-1 justify-between">
          <View />

          <View className="px-2">
            <Text className="text-center text-[28px] font-bold leading-[33px] text-white">
              {headline}
            </Text>
          </View>

          <Button
            label="Finish setup"
            icon={ArrowRight}
            onPress={() => router.push('/onboarding/screentime')}
          />
        </View>
      </SlidePanel>
    </Screen>
  );
}
