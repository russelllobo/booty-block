import { router } from 'expo-router';
import { Check, LockKeyhole, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function ScreenTime() {
  const { screenTimeStatus, requestScreenTime } = useBootyblock();
  const [loading, setLoading] = useState(false);
  const approved = screenTimeStatus === 'approved';

  async function request() {
    setLoading(true);
    await requestScreenTime();
    setLoading(false);
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={9} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1">
          <Header
            title="One quick permission"
            subtitle="Allow Screen Time so Bootyblock can shield the apps you choose."
          />

          <View className="flex-1 items-center justify-center gap-5">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-petal">
              {approved ? (
                <Check size={48} stroke={colors.raspberry} strokeWidth={2.5} />
              ) : (
                <ShieldAlert size={48} stroke={colors.raspberry} strokeWidth={2.5} />
              )}
            </View>
            <Text className="text-center text-3xl font-black text-cocoa">
              {approved ? 'You’re all set' : 'Screen Time access'}
            </Text>
            <Text className="max-w-[310px] text-center text-base font-semibold leading-6 text-mink">
              This enables Apple’s native app blocking. You’ll choose which apps to block on the next screen.
            </Text>
          </View>

          <View className="gap-3">
            {!approved ? (
              <Button label="Allow Screen Time" icon={LockKeyhole} loading={loading} onPress={request} />
            ) : null}
            <Button
              label="Choose apps"
              variant={approved ? 'primary' : 'secondary'}
              onPress={() => router.push('/onboarding/apps')}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
