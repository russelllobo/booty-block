import { router } from 'expo-router';
import { Check, LockKeyhole, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { entitlementBundleIds } from '../../constants/bootyblock';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Permissions() {
  const { screenTimeStatus, requestScreenTime } = useBootyblock();
  const [loading, setLoading] = useState(false);

  const approved = screenTimeStatus === 'approved';

  async function request() {
    setLoading(true);
    await requestScreenTime();
    setLoading(false);
  }

  return (
    <Screen>
      <Header title="Permission check" subtitle="iOS needs Screen Time access before Bootyblock can shield apps." back={() => router.back()} />

      <SectionPanel title="Screen Time" subtitle="This permission lets Bootyblock apply Apple’s native blocking screen to apps you select.">
        <View className="items-center gap-4">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-petal">
            {approved ? <Check size={42} stroke={colors.raspberry} /> : <ShieldAlert size={42} stroke={colors.raspberry} />}
          </View>
          <Text className="text-center text-4xl font-black text-cocoa">{approved ? 'Approved' : 'Needs approval'}</Text>
          <Text className="text-center text-base font-semibold leading-6 text-mink">
            Distribution also requires Apple’s Family Controls entitlement before TestFlight or App Store release.
          </Text>
        </View>
      </SectionPanel>

      <View className="mt-4 rounded-[28px] bg-cocoa px-5 py-4">
        <Text className="text-sm font-black uppercase tracking-[1.8px] text-petal">Apple entitlement bundle IDs</Text>
        {entitlementBundleIds.map((id) => (
          <Text key={id} className="mt-2 text-sm font-semibold text-white">
            {id}
          </Text>
        ))}
      </View>

      <View className="mt-auto gap-3 pt-6">
        {!approved ? <Button label="Allow Screen Time" icon={LockKeyhole} loading={loading} onPress={request} /> : null}
        <Button label="Choose apps" variant={approved ? 'primary' : 'secondary'} onPress={() => router.push('/onboarding/apps')} />
      </View>
    </Screen>
  );
}
