import { DeviceActivitySelectionViewPersisted } from 'react-native-device-activity';
import { router } from 'expo-router';
import { AppWindow, Check, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { SlidePanel } from '../../components/SlidePanel';
import { SELECTION_ID } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
} from '../../lib/services/screenTime';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Apps() {
  const { markSelectionConfigured, selectedAppsConfigured, screenTimeStatus } = useBootyblock();
  const nativePickerReady = Platform.OS === 'ios' && screenTimeService.isAvailable() && screenTimeStatus === 'approved';
  const [selectionSummary, setSelectionSummary] = useState<ScreenTimeSelectionSummary | null>(null);
  const hasSelection = Boolean(selectionSummary);

  useEffect(() => {
    if (nativePickerReady) {
      setSelectionSummary(screenTimeService.getSelectionSummary());
    }
  }, [nativePickerReady]);

  async function save() {
    const configured = await markSelectionConfigured();
    if (!configured) {
      Alert.alert(
        'Choose at least one app',
        'Select an app, category, or website in Apple’s picker before continuing.',
      );
      return;
    }
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
                onSelectionChange={(event) => {
                  const metadata = event.nativeEvent;
                  const nextSummary = {
                    applicationCount: metadata.applicationCount,
                    categoryCount: metadata.categoryCount,
                    webDomainCount: metadata.webDomainCount,
                  };
                  const hasItems =
                    nextSummary.applicationCount +
                      nextSummary.categoryCount +
                      nextSummary.webDomainCount >
                    0;
                  setSelectionSummary(hasItems ? nextSummary : null);
                }}
                style={{ flex: 1, width: '100%', minHeight: 360 }}
              />
            ) : (
              <View className="flex-1 items-center justify-center gap-4 p-6">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-petal">
                  <AppWindow size={34} stroke={colors.raspberry} />
                </View>
                <Text className="text-center text-2xl font-black text-cocoa">Screen Time access needed</Text>
                <Text className="text-center text-base font-semibold leading-6 text-mink">
                  Apple’s app picker appears after Screen Time access is approved on a supported iPhone. You can review access and try again from Settings.
                </Text>
              </View>
            )}
          </View>

          <SectionPanel title="Shield behavior" subtitle="Selected apps stay blocked until you earn minutes. The shield button attempts to open Bootyblock; if iOS does not allow it, the shield copy tells users to open Bootyblock manually.">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-mint">
                {hasSelection ? <Check size={20} stroke={colors.cocoa} /> : <RotateCcw size={20} stroke={colors.cocoa} />}
              </View>
              <Text className="flex-1 text-base font-bold text-cocoa">
                {hasSelection
                  ? screenTimeService.formatSelectionSummary(selectionSummary)
                  : selectedAppsConfigured
                    ? 'Update your selection, then save'
                    : 'Choose at least one app or category'}
              </Text>
            </View>
          </SectionPanel>

          <View className="mt-auto pt-6">
            {nativePickerReady ? (
              <Button
                label={hasSelection ? 'Save and calibrate' : 'Choose apps above'}
                icon={Check}
                disabled={!hasSelection}
                onPress={save}
              />
            ) : (
              <Button
                label="Review Screen Time access"
                icon={AppWindow}
                onPress={() => router.push('/onboarding/screentime')}
              />
            )}
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
