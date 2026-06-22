import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated';

import { colors, shadow } from '../constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

const DEPTH = 6;
const RELEASE_DELAY = 160;

export function Button({ label, onPress, icon: Icon, variant = 'primary', disabled, loading }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const inert = disabled || loading;

  const press = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const primaryStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * DEPTH }],
  }));

  const flatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
  }));

  function handlePressIn() {
    press.value = withSpring(1, { stiffness: 500, damping: 30, reduceMotion: ReduceMotion.System });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handlePressOut() {
    press.value = withSpring(0, { stiffness: 300, damping: 14, reduceMotion: ReduceMotion.System });
  }

  function handlePress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onPress();
    }, RELEASE_DELAY);
  }

  const surface = (
    <Animated.View style={isPrimary ? primaryStyle : flatStyle}>
      <Pressable
        accessibilityRole="button"
        disabled={inert}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={isPrimary ? shadow : undefined}
        className={[
          'min-h-14 flex-row items-center justify-center gap-2 rounded-full px-6',
          isPrimary && 'bg-raspberry',
          isSecondary && 'border border-raspberry/20 bg-white/80',
          variant === 'ghost' && 'bg-transparent',
          inert && 'opacity-60',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {loading ? <ActivityIndicator color={isPrimary ? colors.white : colors.raspberry} /> : null}
        {!loading && Icon ? <Icon size={20} stroke={isPrimary ? colors.white : colors.raspberry} strokeWidth={2.4} /> : null}
        <Text className={['text-base font-bold', isPrimary ? 'text-white' : 'text-raspberry'].join(' ')}>{label}</Text>
      </Pressable>
    </Animated.View>
  );

  if (!isPrimary) {
    return surface;
  }

  return (
    <View style={{ position: 'relative', marginBottom: DEPTH }}>
      {!inert ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: DEPTH,
            bottom: -DEPTH,
            left: 0,
            right: 0,
            borderRadius: 9999,
            backgroundColor: colors.cherry,
          }}
        />
      ) : null}
      {surface}
    </View>
  );
}
