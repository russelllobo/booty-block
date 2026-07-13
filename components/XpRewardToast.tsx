import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { useBootyblock } from '../lib/store/BootyblockProvider';
import { Text } from './AppText';

export function XpRewardToast() {
  const { xpRewardNotice, dismissXpRewardNotice } = useBootyblock();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const amountScale = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    if (!xpRewardNotice) return;

    progress.setValue(0);
    amountScale.setValue(0.65);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 1,
          stiffness: 260,
          damping: 22,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.spring(amountScale, {
          toValue: 1,
          stiffness: 300,
          damping: 14,
          mass: 0.65,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2800),
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) dismissXpRewardNotice();
    });

    return () => animation.stop();
  }, [amountScale, dismissXpRewardNotice, progress, xpRewardNotice]);

  if (!xpRewardNotice) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.notice,
          {
            bottom: Math.max(insets.bottom, 16) + 76,
            opacity: progress,
            transform: [{
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [120, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.icon}>
          <Sparkles size={22} stroke={colors.cocoa} strokeWidth={3} />
        </View>
        <View style={styles.copy}>
          <Animated.View style={{ transform: [{ scale: amountScale }] }}>
            <Text style={styles.amount}>+{xpRewardNotice.amount} XP</Text>
          </Animated.View>
          <Text style={styles.message}>{xpRewardNotice.title} · {xpRewardNotice.message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.cocoa,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 12,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'absolute',
    right: 24,
    shadowColor: colors.cocoa,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
  },
  amount: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  message: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
