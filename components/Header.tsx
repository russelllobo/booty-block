import type { ReactNode } from 'react';
import { ChevronLeft, Settings } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { BrandLockup } from './BrandLockup';

type HeaderProps = {
  title: string;
  subtitle?: string;
  back?: () => void;
  settings?: () => void;
  logo?: boolean;
  centerLogo?: boolean;
  logoHeight?: number;
  logoTextVariant?: 'brand' | 'quiet';
  rightAccessory?: ReactNode;
};

export function Header({ title, subtitle, back, settings, logo, centerLogo, logoHeight = 46, logoTextVariant, rightAccessory }: HeaderProps) {
  return (
    <View className={logo ? 'relative mb-20 min-h-[50px] flex-row items-center gap-3 pt-2' : 'mb-5 flex-row items-center gap-3'}>
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
      {logo ? (
        <View className={centerLogo ? 'absolute inset-x-0 top-2 items-center' : ''}>
          <BrandLockup height={logoHeight} label={`${title} logo`} textVariant={logoTextVariant} />
        </View>
      ) : null}
      <View className="flex-1">
        {!logo ? <Text className="text-[28px] font-bold leading-[33px] text-cocoa">{title}</Text> : null}
        {!logo && subtitle ? <Text className="mt-1 text-base font-semibold text-mink">{subtitle}</Text> : null}
      </View>
      {rightAccessory || settings ? (
        <View className="z-[40] flex-row items-center gap-2">
          {rightAccessory}
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
      ) : null}
    </View>
  );
}
