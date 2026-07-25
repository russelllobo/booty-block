import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { colors } from '../constants/theme';

export const ONBOARDING_TOTAL = 31;

type OnboardingProgressProps = {
  step: number;
  onBack?: () => void;
  showBar?: boolean;
  dark?: boolean;
};

export function OnboardingProgress({ onBack, dark = false }: OnboardingProgressProps) {
  return (
    <View className="mb-5 flex-row items-center gap-4">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className={[
            'h-11 w-11 items-center justify-center rounded-full',
            dark ? 'border border-white/25 bg-white/12' : 'bg-white/70',
          ].join(' ')}
        >
          <ChevronLeft size={24} stroke={dark ? colors.white : colors.cocoa} strokeWidth={2.4} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}

      <View className="flex-1" />
    </View>
  );
}
