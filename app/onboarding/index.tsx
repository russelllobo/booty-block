import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';

import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { shadow } from '../../constants/theme';

export default function Onboarding() {
  const { height } = useWindowDimensions();
  const demoHeight = Math.min(410, Math.max(260, height * 0.44));

  useEffect(() => {
    const source = Image.resolveAssetSource(require('../../assets/onboarding/slide-two.jpg'));
    if (source?.uri) {
      void Image.prefetch(source.uri);
    }
  }, []);

  return (
    <Screen scroll={false}>
      <SlidePanel>
        <View className="flex-1">
          <View className="flex-row items-center justify-center gap-2 pb-5 pt-1">
            <BrandLogo height={42} label="Bootyblock logo" />
            <Text className="text-2xl font-black tracking-[-1px] text-cocoa">Bootyblock</Text>
          </View>

          <View
            className="overflow-hidden rounded-[34px] border border-white/80 bg-black"
            style={[{ height: demoHeight }, shadow]}
          >
            <View className="flex-1 bg-black" />
          </View>

          <View className="flex-1 justify-end pt-5">
            <Text className="px-10 text-center text-[28px] font-bold leading-[33px] text-cocoa">
              Block your apps until you{' '}
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
      </SlidePanel>
    </Screen>
  );
}
