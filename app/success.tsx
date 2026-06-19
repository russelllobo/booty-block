import { router } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Success() {
  const { activeUnlock } = useBootyblock();

  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-mint">
          <CheckCircle2 size={58} stroke={colors.cocoa} />
        </View>
        <Text className="mt-8 text-center text-5xl font-black text-cocoa">Unlocked</Text>
        <Text className="mt-3 text-center text-lg font-bold leading-7 text-mink">
          {activeUnlock ? `${activeUnlock.minutes} minutes earned with ${activeUnlock.squats} squats.` : 'Your earned scroll time is active.'}
        </Text>
      </View>

      <View className="gap-3">
        <Button label="Go to home" icon={Sparkles} onPress={() => router.replace('/(tabs)')} />
        <Button label="Earn more" variant="secondary" onPress={() => router.replace('/(tabs)/plan')} />
      </View>
    </Screen>
  );
}
