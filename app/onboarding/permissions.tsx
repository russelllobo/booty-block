import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Dumbbell,
  Heart,
  LockKeyhole,
  MessageCircle,
  Music2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { ReactNode } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';

function AppTile({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <View
      className={`absolute h-12 w-12 items-center justify-center rounded-[16px] border border-white/70 bg-white/80 ${className}`}
      style={shadow}
    >
      {children}
    </View>
  );
}

function PermissionArtwork({ height }: { height: number }) {
  return (
    <View
      className="relative w-full overflow-hidden rounded-[36px] border border-white/80 bg-petal"
      style={[{ height }, shadow]}
    >
      <LinearGradient
        colors={['#FFF8F3', '#FFD6E7', '#FFB4D2']}
        locations={[0, 0.55, 1]}
        className="absolute inset-0"
      />

      <View className="absolute -left-10 top-5 h-36 w-36 rounded-full bg-white/35" />
      <View className="absolute -right-8 bottom-7 h-44 w-44 rounded-full bg-raspberry/10" />
      <Sparkles
        size={24}
        stroke={colors.raspberry}
        strokeWidth={2}
        style={{ position: 'absolute', right: 28, top: 25, opacity: 0.72 }}
      />
      <Sparkles
        size={18}
        stroke={colors.cherry}
        strokeWidth={2}
        style={{ position: 'absolute', left: 29, bottom: 38, opacity: 0.5 }}
      />

      <View className="absolute left-1/2 top-[12%] h-[76%] w-[46%] -translate-x-1/2 rotate-[-7deg] rounded-[38px] bg-cocoa p-[7px]">
        <LinearGradient
          colors={[colors.raspberry, colors.bubble, colors.petal]}
          className="flex-1 items-center rounded-[32px] pt-7"
        >
          <View className="h-1.5 w-11 rounded-full bg-cocoa/60" />
          <View className="mt-8 h-16 w-16 items-center justify-center rounded-[24px] bg-white/85">
            <ShieldCheck size={36} stroke={colors.raspberry} strokeWidth={2.4} />
          </View>
          <View className="mt-auto mb-5 h-1.5 w-14 rounded-full bg-white/60" />
        </LinearGradient>
      </View>

      <View className="absolute left-[-7%] top-[45%] h-[24%] w-[114%] rotate-[9deg] rounded-[999px] border-[12px] border-cocoa/90" />
      <View className="absolute left-[-10%] top-[52%] h-[24%] w-[120%] rotate-[-10deg] rounded-[999px] border-[10px] border-cherry/85" />

      <View
        className="absolute left-1/2 top-[48%] h-[76px] w-[68px] -translate-x-1/2 items-center justify-center rounded-[24px] bg-raspberry"
        style={shadow}
      >
        <LockKeyhole size={30} stroke={colors.white} strokeWidth={2.6} />
        <Heart
          size={13}
          fill={colors.white}
          stroke={colors.white}
          style={{ position: 'absolute', bottom: 9 }}
        />
      </View>

      <View
        className="absolute left-1/2 top-[4%] h-16 w-28 -translate-x-1/2 rotate-[8deg] flex-row items-center justify-center"
        style={shadow}
      >
        <View className="h-10 w-5 rounded-lg bg-cherry" />
        <View className="h-5 w-16 bg-raspberry" />
        <View className="h-10 w-5 rounded-lg bg-cherry" />
        <Dumbbell
          size={70}
          stroke={colors.white}
          strokeWidth={1.6}
          style={{ position: 'absolute', opacity: 0.2 }}
        />
      </View>

      <AppTile className="left-5 top-[22%] rotate-[-12deg]">
        <MessageCircle size={23} stroke={colors.raspberry} strokeWidth={2.5} />
      </AppTile>
      <AppTile className="right-5 top-[31%] rotate-[10deg]">
        <Music2 size={23} stroke={colors.cherry} strokeWidth={2.5} />
      </AppTile>
      <AppTile className="bottom-5 right-11 rotate-[-8deg]">
        <Heart size={22} stroke={colors.raspberry} strokeWidth={2.5} />
      </AppTile>
    </View>
  );
}

export default function Permissions() {
  const { height } = useWindowDimensions();
  const artworkHeight = Math.min(430, Math.max(300, height * 0.44));

  return (
    <Screen scroll={false}>
      <View className="flex-1">
        <OnboardingProgress step={1} onBack={() => router.back()} />

        <SlidePanel>
          <View className="flex-1">
            <Text className="mb-4 text-center text-[34px] font-black leading-[37px] tracking-[-1.2px] text-cocoa">
              Understanding more{'\n'}
              <Text className="text-raspberry">about your situation</Text>
            </Text>

            <PermissionArtwork height={artworkHeight} />

            <View className="flex-1 justify-end pt-4">
              <Text className="px-2 text-center text-base font-semibold leading-6 text-mink">
                We’ll use your answers to shape a Bootyblock plan that fits your goals.
              </Text>

              <View className="pt-5">
                <Button
                  label="Start Quiz"
                  onPress={() => router.push('/onboarding/quiz')}
                />
              </View>
            </View>
          </View>
        </SlidePanel>
      </View>
    </Screen>
  );
}
