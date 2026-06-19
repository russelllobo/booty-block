import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors, shadow } from '../constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, icon: Icon, variant = 'primary', disabled, loading }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={[
        'min-h-14 flex-row items-center justify-center gap-2 rounded-full px-6',
        isPrimary && 'bg-raspberry',
        isSecondary && 'border border-raspberry/20 bg-white/80',
        variant === 'ghost' && 'bg-transparent',
        (disabled || loading) && 'opacity-60',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isPrimary ? shadow : undefined}
    >
      {loading ? <ActivityIndicator color={isPrimary ? colors.white : colors.raspberry} /> : null}
      {!loading && Icon ? <Icon size={20} stroke={isPrimary ? colors.white : colors.raspberry} strokeWidth={2.4} /> : null}
      <Text className={['text-base font-bold', isPrimary ? 'text-white' : 'text-raspberry'].join(' ')}>{label}</Text>
    </Pressable>
  );
}
