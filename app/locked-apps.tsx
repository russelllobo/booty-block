import { DeviceActivitySelectionViewPersisted } from 'react-native-device-activity';
import { router } from 'expo-router';
import { AppWindow, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, View } from 'react-native';

import { Text } from '../components/AppText';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { SELECTION_ID } from '../constants/bootyblock';
import { colors } from '../constants/theme';
import { screenTimeService, type ScreenTimeSelectionSummary } from '../lib/services/screenTime';
import { useBootyblock } from '../lib/store/BootyblockProvider';

const previewApps = [
  { name: 'Instagram', icon: require('../assets/onboarding/app-icons/instagram.png') },
  { name: 'TikTok', icon: require('../assets/onboarding/app-icons/tiktok.png') },
  { name: 'YouTube', icon: require('../assets/onboarding/app-icons/youtube.png') },
];

export default function LockedApps() {
  const { hasAppAccess, markSelectionConfigured, screenTimeStatus } = useBootyblock();
  const webPreview = Platform.OS === 'web';
  const nativePickerReady = Platform.OS === 'ios' && screenTimeService.isAvailable() && screenTimeStatus === 'approved';
  const [selectionSummary, setSelectionSummary] = useState<ScreenTimeSelectionSummary | null>(
    webPreview ? { applicationCount: 3, categoryCount: 0, webDomainCount: 0 } : null,
  );

  useEffect(() => {
    if (!hasAppAccess) router.replace('/(tabs)/lock-list');
  }, [hasAppAccess]);

  useEffect(() => {
    if (nativePickerReady) setSelectionSummary(screenTimeService.getSelectionSummary());
  }, [nativePickerReady]);

  async function save() {
    const configured = await markSelectionConfigured();
    if (!configured) {
      Alert.alert('Choose at least one app', 'Select an app, category, or website before saving.');
      return;
    }
    router.replace('/(tabs)/lock-list');
  }

  return (
    <Screen scroll={false} backgroundColor="#FFF7F2" backgroundGradient={['#FFF9F5', '#FFF1F6', '#FFE9DE']}>
      <Header
        title="locked apps"
        subtitle="choose the apps that should make you squat before scrolling"
        back={() => router.back()}
      />

      <View className="min-h-[480px] flex-1 overflow-hidden rounded-[26px] border border-white/80 bg-white/80">
        {nativePickerReady ? (
          <DeviceActivitySelectionViewPersisted
            familyActivitySelectionId={SELECTION_ID}
            includeEntireCategory
            headerText="Choose apps for bootyblock"
            footerText="These apps will lock at your enabled booty lock times."
            onSelectionChange={(event) => {
              const metadata = event.nativeEvent;
              const next = {
                applicationCount: metadata.applicationCount,
                categoryCount: metadata.categoryCount,
                webDomainCount: metadata.webDomainCount,
                applications: metadata.applications ?? [],
              };
              setSelectionSummary(next.applicationCount + next.categoryCount + next.webDomainCount > 0 ? next : null);
            }}
            style={{ flex: 1, minHeight: 480, width: '100%' }}
          />
        ) : webPreview ? (
          <View className="flex-1 items-center justify-center gap-7 p-7">
            <View className="flex-row gap-4">
              {previewApps.map((app) => (
                <View key={app.name} className="items-center gap-2">
                  <Image
                    source={app.icon}
                    accessibilityLabel={app.name}
                    style={{ width: 64, height: 64, borderRadius: 18 }}
                  />
                  <Text className="text-xs font-black text-cocoa">{app.name}</Text>
                </View>
              ))}
            </View>
            <Text className="text-center text-base font-semibold leading-6 text-mink">
              Apple’s native app picker appears here on iPhone.
            </Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-5 p-7">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-petal">
              <AppWindow size={34} stroke={colors.raspberry} />
            </View>
            <Text className="text-center text-[25px] font-black text-cocoa">Screen Time access needed</Text>
            <Text className="text-center text-base font-semibold leading-6 text-mink">
              Approve Screen Time access before choosing locked apps.
            </Text>
          </View>
        )}
      </View>

      <View className="pt-5">
        {nativePickerReady || webPreview ? (
          <Button
            label={selectionSummary ? 'save locked apps' : 'choose at least one app'}
            icon={Check}
            disabled={!selectionSummary}
            onPress={() => void save()}
          />
        ) : (
          <Button label="review Screen Time access" icon={AppWindow} onPress={() => router.push('/onboarding/screentime')} />
        )}
      </View>
    </Screen>
  );
}
