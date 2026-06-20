import { DeviceActivitySelectionViewPersisted } from 'react-native-device-activity';
import { router } from 'expo-router';
import { AppWindow, Check, RotateCcw } from 'lucide-react-native';
import { Platform, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { SlidePanel } from '../../components/SlidePanel';
import { SELECTION_ID } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { screenTimeService } from '../../lib/services/screenTime';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Apps() {
  const { markSelectionConfigured, selectedAppsConfigured, screenTimeStatus } = useBootyblock();
  const nativePickerReady = Platform.OS === 'ios' && screenTimeService.isAvailable() && screenTimeStatus === 'approved';

  async function save() {
    await markSelectionConfigured();
    router.push('/onboarding/calibration');
  }

  return (
    <Screen>
      <OnboardingProgress step={10} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1">
          <Header title="Blocked apps" subtitle="Pick the apps that should make you squat before scrolling." />

          <View className="min-h-[360px] overflow-hidden rounded-[28px] bg-white/75">
            {nativePickerReady ? (
              <DeviceActivitySelectionViewPersisted
                familyActivitySelectionId={SELECTION_ID}
                includeEntireCategory
                headerText="Choose apps for Bootyblock"
                footerText="You can change this later in Settings."
                style={{ flex: 1, width: '100%', minHeight: 360 }}
              />
            ) : (
              <View className="flex-1 items-center justify-center gap-4 p-6">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-petal">
                  <AppWindow size={34} stroke={colors.raspberry} />
                </View>
                <Text className="text-center text-2xl font-black text-cocoa">Native picker waits for iPhone</Text>
                <Text className="text-center text-base font-semibold leading-6 text-mink">
                  In a custom iOS build with Screen Time approval, Apple’s app picker appears here. This MVP marks the setup so the rest of the flow can be tested now.
                </Text>
              </View>
            )}
          </View>

          <SectionPanel title="Shield behavior" subtitle="Selected apps stay blocked until you earn minutes. The shield button attempts to open Bootyblock; if iOS does not allow it, the shield copy tells users to open Bootyblock manually.">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-mint">
                {selectedAppsConfigured ? <Check size={20} stroke={colors.cocoa} /> : <RotateCcw size={20} stroke={colors.cocoa} />}
              </View>
              <Text className="flex-1 text-base font-bold text-cocoa">
                {selectedAppsConfigured ? 'Selection configured' : 'Selection not saved yet'}
              </Text>
            </View>
          </SectionPanel>

          <View className="mt-auto pt-6">
            <Button label="Save and calibrate" icon={Check} onPress={save} />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
