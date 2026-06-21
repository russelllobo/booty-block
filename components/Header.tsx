import { ChevronLeft, Settings } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { BrandLogo } from './BrandLogo';

type HeaderProps = {
  title: string;
  subtitle?: string;
  back?: () => void;
  settings?: () => void;
  logo?: boolean;
};

export function Header({ title, subtitle, back, settings, logo }: HeaderProps) {
  return (
    <View className="mb-5 flex-row items-center gap-3">
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/70"
        >
          <ChevronLeft size={24} stroke={colors.cocoa} />
        </Pressable>
      ) : null}
      {logo ? <BrandLogo height={46} label={`${title} logo`} /> : null}
      <View className="flex-1">
        <Text className="text-3xl font-black text-cocoa">{title}</Text>
        {subtitle ? <Text className="mt-1 text-base font-semibold text-mink">{subtitle}</Text> : null}
      </View>
      {settings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={settings}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/70"
        >
          <Settings size={22} stroke={colors.cocoa} />
        </Pressable>
      ) : null}
    </View>
  );
}
