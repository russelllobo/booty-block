import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Camera, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../components/Button';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { PoseOverlay } from '../components/PoseOverlay';
import { Screen } from '../components/Screen';
import { SlidePanel } from '../components/SlidePanel';
import { MINUTES_TO_SQUATS } from '../constants/bootyblock';
import { colors, shadow } from '../constants/theme';
import { captureAnalytics } from '../lib/analytics';
import { usePoseSession } from '../lib/services/pose';
import { useBootyblock } from '../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../modules/booty-pose/src/BootyPoseCameraView';
import type { PosePhase } from '../modules/booty-pose/src/BootyPose.types';

type Phase = {
  instruction: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number; style?: { marginTop?: number } }>;
  accent: string;
};

function useSessionDisplayPhase(phase: PosePhase, visible: boolean) {
  const [displayPhase, setDisplayPhase] = useState(phase);
  const displayPhaseRef = useRef(phase);
  const standingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    displayPhaseRef.current = displayPhase;
  }, [displayPhase]);

  useEffect(() => {
    if (standingTimerRef.current) {
      clearTimeout(standingTimerRef.current);
      standingTimerRef.current = null;
    }

    if (!visible) {
      setDisplayPhase(phase);
      return;
    }

    if (displayPhaseRef.current === 'descending' && phase === 'standing') {
      standingTimerRef.current = setTimeout(() => {
        setDisplayPhase('standing');
        standingTimerRef.current = null;
      }, 500);
      return () => {
        if (standingTimerRef.current) {
          clearTimeout(standingTimerRef.current);
          standingTimerRef.current = null;
        }
      };
    }

    setDisplayPhase(phase);
  }, [phase, visible]);

  return displayPhase;
}

export default function Session() {
  const { requestedMinutes, bankTime } = useBootyblock();
  const posthog = usePostHog();
  const target = requestedMinutes * MINUTES_TO_SQUATS;
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionActive, setSessionActive] = useState(true);
  const pose = usePoseSession({ target, active: Boolean(permission?.granted) && sessionActive });
  const unlockStarted = useRef(false);
  const countScale = useRef(new Animated.Value(1)).current;
  const countFlash = useRef(new Animated.Value(0)).current;
  const prevCountRef = useRef(pose.count);
  const { width } = useWindowDimensions();
  const displayPhase = useSessionDisplayPhase(pose.phase, pose.visible);
  const remainingSquats = Math.max(target - pose.count, 0);
  const [popKey, setPopKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const phase: Phase = !pose.visible
    ? { instruction: 'STEP BACK', icon: ArrowDown, accent: colors.white }
    : displayPhase === 'calibrating'
      ? { instruction: 'STAND TALL', icon: ArrowDown, accent: colors.white }
      : displayPhase === 'standing'
        ? { instruction: 'DO ONE SQUAT', icon: ArrowDown, accent: colors.white }
        : displayPhase === 'descending'
          ? { instruction: 'GO LOWER', icon: ArrowDown, accent: colors.white }
          : displayPhase === 'bottom'
            ? { instruction: 'SQUAT DETECTED', icon: ArrowUp, accent: colors.lime }
            : displayPhase === 'rising'
              ? { instruction: 'SQUAT DETECTED', icon: CheckCircle2, accent: colors.lime }
              : { instruction: 'YOU’RE READY', icon: CheckCircle2, accent: colors.lime };
  const PhaseIcon = phase.icon;

  useEffect(() => {
    if (pose.count < target || unlockStarted.current) return;

    unlockStarted.current = true;
    setSessionActive(false);
    setCelebrating(true);
    captureAnalytics(posthog, 'unlock_earned', {
      minutes: requestedMinutes,
      squats: target,
    });

    let cancelled = false;
    const startedAt = Date.now();
    void bankTime(requestedMinutes)
      .then(() => {
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, 1800 - elapsed);
        setTimeout(() => {
          if (cancelled) return;
          router.replace('/success');
        }, remaining);
      })
      .catch((error) => {
        if (cancelled) return;
        unlockStarted.current = false;
        console.error('Failed to grant earned unlock:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [bankTime, pose.count, posthog, requestedMinutes, target]);

  useEffect(() => {
    captureAnalytics(posthog, 'session_started', {
      minutes: requestedMinutes,
      target_squats: target,
    });
  }, [posthog, requestedMinutes, target]);

  useEffect(() => {
    const previous = prevCountRef.current;
    prevCountRef.current = pose.count;

    if (pose.count > previous) {
      setPopKey((key) => key + 1);

      if (pose.count >= target) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  }, [pose.count, target]);

  useEffect(() => {
    countScale.setValue(1.34);
    countFlash.setValue(0.9);
    Animated.parallel([
      Animated.spring(countScale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 220,
        damping: 11,
        mass: 0.6,
      }),
      Animated.timing(countFlash, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [countScale, countFlash, remainingSquats]);

  return (
    <Screen scroll={false}>
      <SlidePanel>
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="absolute left-0 top-0 z-10 h-14 w-14 items-center justify-center rounded-full bg-white/80"
          >
            <ChevronLeft size={26} stroke={colors.cocoa} strokeWidth={2.6} />
          </Pressable>

          <View
            className="mb-4 items-center rounded-[24px] border border-white/20 px-3 py-4"
            style={{ backgroundColor: 'rgba(58, 31, 44, 0.92)' }}
          >
            {permission?.granted ? (
              <>
                <Text
                  className="text-center font-black"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{
                    color: phase.accent,
                    fontSize: Math.min(48, Math.max(32, width * 0.095)),
                    lineHeight: Math.min(50, Math.max(34, width * 0.1)),
                    letterSpacing: -1.5,
                  }}
                >
                  {phase.instruction}
                </Text>
                <PhaseIcon
                  size={74}
                  strokeWidth={4}
                  stroke={phase.accent}
                  style={{ marginTop: 2 }}
                />
              </>
            ) : (
              <Text
                className="text-center text-[28px] font-bold leading-[33px] text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Squats
              </Text>
            )}
          </View>

          <View
            className="flex-1 overflow-hidden rounded-[34px] border border-white/80 bg-black"
            style={shadow}
          >
            {permission?.granted ? (
              <>
                {Platform.OS === 'ios' ? (
                  <BootyPoseCameraView style={styles.cameraFill} />
                ) : (
                  <CameraView
                    facing="front"
                    mirror
                    active
                    style={styles.cameraFill}
                    onMountError={(error) => console.error('Session camera failed to mount:', error.message)}
                  />
                )}
                <PoseOverlay
                  landmarks={pose.landmarks}
                  phase={pose.phase}
                  visible={pose.visible}
                  frameWidth={pose.frameWidth}
                  frameHeight={pose.frameHeight}
                />
                <View style={styles.remainingCountContainer} pointerEvents="none">
                  <View style={styles.countWrap}>
                    {popKey > 0 ? (
                      <View key={popKey} style={styles.plusOneWrap} pointerEvents="none">
                        <PlusOnePop />
                      </View>
                    ) : null}
                    <Animated.Text
                      accessibilityLabel={`${remainingSquats} squats remaining`}
                      className="text-center font-black text-white"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.remainingCount, { transform: [{ scale: countScale }] }]}
                    >
                      {remainingSquats}
                    </Animated.Text>
                    <Animated.Text
                      pointerEvents="none"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[
                        styles.remainingCount,
                        styles.remainingCountFlash,
                        { opacity: countFlash, transform: [{ scale: countScale }] },
                      ]}
                    >
                      {remainingSquats}
                    </Animated.Text>
                  </View>
                </View>
                <CelebrationOverlay visible={celebrating} />
              </>
            ) : (
              <View className="flex-1 items-center justify-center gap-5 p-8">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-petal">
                  <Camera size={44} stroke={colors.raspberry} strokeWidth={2.5} />
                </View>
                <Text className="text-center text-[24px] font-bold leading-[29px] text-white">
                  Camera required
                </Text>
                <Text className="text-center text-base font-semibold leading-6 text-petal">
                  Bootyblock needs the camera to count reps on-device.
                </Text>
              </View>
            )}
          </View>

          {!permission?.granted && (
            <View className="flex-row items-center gap-3 pt-5">
              <View className="flex-1">
                <Button label="Allow camera" icon={Camera} onPress={requestPermission} />
              </View>
            </View>
          )}
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transform: [{ scale: 1.18 }],
  },
  remainingCount: {
    fontSize: 112,
    lineHeight: 120,
    letterSpacing: 0,
    textShadowColor: 'rgba(58, 31, 44, 0.72)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  remainingCountFlash: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: colors.lime,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(58, 31, 44, 0.6)',
  },
  countWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOneWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  remainingCountContainer: {
    position: 'absolute',
    right: 0,
    bottom: -10,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

function PlusOnePop() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(6);
    scale.setValue(0.5);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -72,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  }, [opacity, translateY, scale]);

  return (
    <Animated.Text
      style={{
        fontSize: 28,
        fontWeight: '900',
        color: colors.lime,
        opacity,
        transform: [{ translateY }, { scale }],
        textShadowColor: 'rgba(58, 31, 44, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
      }}
    >
      −1
    </Animated.Text>
  );
}
