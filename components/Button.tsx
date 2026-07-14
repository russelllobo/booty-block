import * as Haptics from 'expo-haptics';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { LucideIcon } from 'lucide-react-native';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from './AppText';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';

import { colors, shadow } from '../constants/theme';
import { useSlideTransitionLayer } from './SlidePanel';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  foregroundColor?: string;
  noOutline?: boolean;
  pressDelayMs?: number;
  size?: 'default' | 'large';
};

const DEPTH = 6;
const RELEASE_DELAY = 160;

const GLASS_AVAILABLE = (() => {
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

export function Button({ label, onPress, icon: Icon, iconPosition = 'left', variant = 'primary', disabled, loading, foregroundColor, noOutline, pressDelayMs = RELEASE_DELAY, size = 'default' }: ButtonProps) {
  const transitionLayer = useSlideTransitionLayer();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const inert = disabled || loading;
  const useGlass = GLASS_AVAILABLE && (!isPrimary || transitionLayer !== null);

  const press = useSharedValue(0);
  const contentProgress = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [glassMaterial, setGlassMaterial] = useState<'clear' | 'regular'>('regular');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    contentProgress.value = 0;
    contentProgress.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });

    if (!useGlass) return;
    setGlassMaterial('clear');
    const frame = requestAnimationFrame(() => setGlassMaterial('regular'));
    return () => cancelAnimationFrame(frame);
  }, [contentProgress, disabled, label, loading, useGlass]);

  const primaryStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * DEPTH }],
  }));

  const flatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [{ scale: interpolate(contentProgress.value, [0, 1], [0.985, 1]) }],
  }));

  const stationaryStyle = useAnimatedStyle(() => {
    if (!transitionLayer) return {};
    if (transitionLayer.role === 'outgoing') return { opacity: 0 };

    const parentTranslateX =
      (1 - transitionLayer.progress.value)
      * transitionLayer.distance
      * transitionLayer.direction.value;

    return {
      transform: [{ translateX: -parentTranslateX }],
    };
  }, [transitionLayer]);

  function handlePressIn() {
    press.value = withSpring(1, { stiffness: 500, damping: 30, reduceMotion: ReduceMotion.System });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function handlePressOut() {
    press.value = withSpring(0, { stiffness: 300, damping: 14, reduceMotion: ReduceMotion.System });
  }

  function handlePress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pressDelayMs <= 0) {
      onPress();
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onPress();
    }, pressDelayMs);
  }

  const contentColor = foregroundColor ?? (isPrimary || isOutline ? colors.white : colors.raspberry);
  const glassStyle: 'clear' | 'regular' = variant === 'ghost' ? 'clear' : 'regular';
  const glassTint = isPrimary
    ? inert
      ? 'rgba(233,30,115,0.38)'
      : 'rgba(233,30,115,0.92)'
    : isSecondary
      ? 'rgba(255,255,255,0.55)'
      : undefined;

  const buttonContent = (
    <Animated.View
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'center',
        },
        contentStyle,
      ]}
    >
      {loading ? <ActivityIndicator color={contentColor} /> : null}
      {!loading && Icon && iconPosition === 'left' ? (
        <Icon size={20} stroke={contentColor} strokeWidth={2.4} />
      ) : null}
      <Text
        className={[size === 'large' ? 'text-xl font-black' : 'text-base font-bold', isPrimary || isOutline ? 'text-white' : 'text-raspberry'].join(' ')}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={foregroundColor ? { color: foregroundColor } : undefined}
      >
        {label}
      </Text>
      {!loading && Icon && iconPosition === 'right' ? (
        <Icon size={20} stroke={contentColor} strokeWidth={2.4} />
      ) : null}
    </Animated.View>
  );

  const surface = (
    <Animated.View style={[isPrimary && !useGlass ? primaryStyle : flatStyle, useGlass && inert ? { opacity: 0.48 } : null]}>
      {useGlass ? (
        <GlassView
          glassEffectStyle={{
            style: glassMaterial === 'clear' ? 'clear' : glassStyle,
            animate: true,
            animationDuration: 0.24,
          }}
          tintColor={glassTint}
          isInteractive
          style={{
            borderRadius: 9999,
            minHeight: size === 'large' ? 72 : 56,
            borderWidth: isPrimary ? 1 : 0,
            borderColor: isPrimary
              ? inert
                ? 'rgba(255,255,255,0.16)'
                : 'rgba(255,255,255,0.42)'
              : 'transparent',
            shadowColor: isPrimary ? colors.raspberry : undefined,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isPrimary && !inert ? 0.28 : 0,
            shadowRadius: 20,
          }}
        >
          <Pressable
            accessibilityRole="button"
            disabled={inert}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{
              minHeight: size === 'large' ? 72 : 56,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {buttonContent}
          </Pressable>
        </GlassView>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={inert}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={isPrimary ? shadow : undefined}
          className={[
            size === 'large' ? 'min-h-[72px] px-8' : 'min-h-14 px-6',
            'flex-row items-center justify-center gap-2 rounded-full',
            isPrimary && 'bg-raspberry',
            isSecondary && (noOutline ? 'bg-white/80' : 'border border-raspberry/20 bg-white/80'),
            isOutline && 'border border-white/55 bg-transparent',
            variant === 'ghost' && 'bg-transparent',
            inert && 'opacity-60',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {buttonContent}
        </Pressable>
      )}
    </Animated.View>
  );

  let result: ReactNode = surface;
  if (isPrimary && !useGlass) {
    result = (
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

  if (!transitionLayer) return result;
  return <Animated.View style={stationaryStyle}>{result}</Animated.View>;
}
