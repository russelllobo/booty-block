import { router } from 'expo-router';
import { ArrowRight, Dumbbell, X } from 'lucide-react-native';
import { Text, View, useWindowDimensions } from 'react-native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, shadow } from '../../constants/theme';

export default function Onboarding() {
  const { height } = useWindowDimensions();
  const demoHeight = Math.min(410, Math.max(260, height * 0.44));

  return (
    <Screen scroll={false}>
      <View className="flex-1">
        <View className="flex-row items-center justify-center gap-2 pb-5 pt-1">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-raspberry">
            <Dumbbell size={17} stroke={colors.white} strokeWidth={2.8} />
          </View>
          <Text className="text-2xl font-black tracking-[-1px] text-cocoa">Bootyblock</Text>
        </View>

        <View
          className="overflow-hidden rounded-[34px] border border-white/80 bg-black"
          style={[{ height: demoHeight }, shadow]}
        >
          <View className="h-14 flex-row items-center justify-between border-b border-white/10 px-5">
            <View className="flex-row items-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-raspberry">
                <Dumbbell size={12} stroke={colors.white} strokeWidth={3} />
              </View>
              <Text className="text-sm font-black text-white">Bootyblock</Text>
            </View>
            <X size={20} stroke="rgba(255,255,255,0.62)" strokeWidth={2.5} />
          </View>

          <View className="flex-1 bg-black" />
        </View>

        <View className="flex-1 justify-end pt-5">
          <Text className="text-center text-[27px] font-black leading-[31px] tracking-[-0.8px] text-cocoa">
            Block your apps before you{' '}
            <Text className="text-raspberry">grow your booty</Text>
          </Text>

          <View className="pt-5">
            <Button
              label="Get started"
              icon={ArrowRight}
              onPress={() => router.push('/onboarding/permissions')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
