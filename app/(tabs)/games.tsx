import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, Play, Trophy, X } from 'lucide-react-native';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { PoseOverlay } from '../../components/PoseOverlay';
import { Screen } from '../../components/Screen';
import {
  calculateFlappySquatReward,
  clamp,
  FLAPPY_SQUAT_GAME_ID,
  mapDepthToBirdY,
  normalizePoseDepth,
  smoothDepth,
} from '../../lib/games/flappySquat';
import { usePoseSession } from '../../lib/services/pose';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../../modules/booty-pose/src/BootyPoseCameraView';
import { colors } from '../../constants/theme';

const AnimatedText = Animated.createAnimatedComponent(Text);

type Pipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

type GameStatus = 'idle' | 'countdown' | 'playing' | 'ended';

const BEST_SCORE_KEY = 'bootyblock:flappy-squat-best';
const GAME_TICK_MS = 40;
const BIRD_SIZE = 42;
const PIPE_WIDTH = 68;
const PIPE_GAP = 152;
const PIPE_SPACING = 210;
const PIPE_SPEED = 4.2;
const COUNTDOWN_START = 3;

function makePipe(id: number, x: number, height: number): Pipe {
  const minGapY = 88;
  const maxGapY = Math.max(minGapY, height - PIPE_GAP - 88);
  const range = Math.max(1, maxGapY - minGapY);
  return {
    id,
    x,
    gapY: minGapY + ((id * 97) % range),
    passed: false,
  };
}

function makeInitialPipes(width: number, height: number) {
  return [0, 1, 2].map((index) => makePipe(index + 1, width + 120 + index * PIPE_SPACING, height));
}

function makePreviewPipes(width: number) {
  return [makePipe(1, Math.max(180, width * 0.58), 360)];
}

function calculateDepthFromPose(depth: number, visible: boolean, fallback: number) {
  if (!visible) return fallback;
  return clamp(depth, 0, 1);
}

function FlappyScene({
  width,
  height,
  birdY,
  pipes,
}: {
  width: number;
  height: number;
  birdY: number;
  pipes: Pipe[];
}) {
  const groundY = height - 28;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#7AD7FF" />
          <Stop offset="1" stopColor="#FFF1F6" />
        </SvgLinearGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#sky)" />
      <Circle cx={width - 54} cy={58} r={26} fill="#FFE56F" />
      <Path d={`M0 ${groundY} C ${width * 0.2} ${groundY - 18}, ${width * 0.42} ${groundY + 8}, ${width * 0.68} ${groundY - 12} S ${width * 0.9} ${groundY + 6}, ${width} ${groundY - 8} L ${width} ${height} L 0 ${height} Z`} fill="#BFF7D3" />
      {pipes.map((pipe) => (
        <Fragment key={pipe.id}>
          <Rect x={pipe.x} y={0} width={PIPE_WIDTH} height={pipe.gapY} rx={13} fill="#3A1F2C" opacity={0.94} />
          <Rect x={pipe.x - 8} y={pipe.gapY - 18} width={PIPE_WIDTH + 16} height={24} rx={12} fill="#7D5A67" />
          <Rect x={pipe.x} y={pipe.gapY + PIPE_GAP} width={PIPE_WIDTH} height={height - pipe.gapY - PIPE_GAP} rx={13} fill="#3A1F2C" opacity={0.94} />
          <Rect x={pipe.x - 8} y={pipe.gapY + PIPE_GAP - 6} width={PIPE_WIDTH + 16} height={24} rx={12} fill="#7D5A67" />
        </Fragment>
      ))}
      <Circle cx={72} cy={birdY + BIRD_SIZE / 2} r={BIRD_SIZE / 2} fill="#FF8FBE" />
      <Circle cx={82} cy={birdY + 15} r={6} fill="#FFFFFF" />
      <Circle cx={84} cy={birdY + 15} r={2.5} fill="#3A1F2C" />
      <Path d={`M52 ${birdY + 24} C 30 ${birdY + 12}, 30 ${birdY + 42}, 54 ${birdY + 34}`} fill="#E91E73" opacity={0.9} />
      <Path d={`M94 ${birdY + 24} L116 ${birdY + 14} L108 ${birdY + 33} Z`} fill="#FFE56F" />
    </Svg>
  );
}

export default function Games() {
  const {
    bankGameTime,
    syncTimeBank,
    subscriptionHydrated,
    isSubscribed,
    requestSubscriptionAccess,
  } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<GameStatus>('idle');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [visibleTicks, setVisibleTicks] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [banking, setBanking] = useState(false);
  const [lastAward, setLastAward] = useState(0);
  const [simulatedDepth, setSimulatedDepth] = useState(0.5);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const depthRef = useRef(0.5);
  const latestDepthRef = useRef(0.5);
  const rawPoseDepthRef = useRef(0);
  const standingDepthRef = useRef<number | null>(null);
  const poseVisibleRef = useRef(false);
  const pipeIdRef = useRef(4);
  const gameStartedAtRef = useRef(0);
  const endedRef = useRef(false);
  const launcherEntrance = useRef(new Animated.Value(0)).current;
  const previewDrift = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const scoreFlash = useRef(new Animated.Value(0)).current;
  const gameActive = status === 'countdown' || status === 'playing';
  const nativePoseActive = gameActive && Boolean(permission?.granted);
  const pose = usePoseSession({
    target: 999,
    active: nativePoseActive,
    // The game needs one continuous calibration. Restarting after a counted
    // squat makes the crouched position the new baseline and pins the bird.
    restartAfterNativeCount: false,
  });
  const rawDepth = calculateDepthFromPose(pose.metrics.depth, pose.visible, simulatedDepth);
  rawPoseDepthRef.current = rawDepth;
  latestDepthRef.current = Platform.OS === 'web'
    ? rawDepth
    : standingDepthRef.current === null
      ? 0
      : normalizePoseDepth(rawDepth, standingDepthRef.current);
  poseVisibleRef.current = pose.visible;
  const birdY = mapDepthToBirdY(depthRef.current, size.height, BIRD_SIZE);
  const canPlay = subscriptionHydrated && isSubscribed;
  const bodyVisible = Platform.OS === 'web' || pose.visible;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      if (size.height <= 0) return;
      setSimulatedDepth(clamp(event.nativeEvent.locationY / size.height, 0, 1));
    },
    onPanResponderMove: (event) => {
      if (size.height <= 0) return;
      setSimulatedDepth(clamp(event.nativeEvent.locationY / size.height, 0, 1));
    },
    onPanResponderRelease: () => setSimulatedDepth(0.5),
  }), [size.height]);

  useEffect(() => {
    syncTimeBank();
  }, [syncTimeBank]);

  useEffect(() => {
    Animated.timing(launcherEntrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();

    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(previewDrift, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(previewDrift, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    );
    drift.start();
    return () => drift.stop();
  }, [launcherEntrance, previewDrift]);

  useEffect(() => {
    void AsyncStorage.getItem(BEST_SCORE_KEY)
      .then((stored) => {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) setBestScore(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!gameActive) {
      router.setParams({ hideTabs: undefined });
      return;
    }

    router.setParams({ hideTabs: '1' });
    return () => router.setParams({ hideTabs: undefined });
  }, [gameActive]);

  const finishGame = useCallback((crashed: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus('ended');
    if (crashed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, []);

  const beginPlaying = useCallback(() => {
    if (endedRef.current) return;
    if (Platform.OS !== 'web') {
      // The user's normal standing pose is the top of the controller range,
      // regardless of the absolute depth reported by the installed tracker.
      standingDepthRef.current = rawPoseDepthRef.current;
      latestDepthRef.current = 0;
    }
    depthRef.current = Platform.OS === 'web' ? latestDepthRef.current : 0;
    gameStartedAtRef.current = Date.now();
    setElapsedMs(0);
    setVisibleTicks(0);
    setTotalTicks(0);
    setStatus('playing');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'countdown') return;

    if (!bodyVisible) {
      setCountdown(COUNTDOWN_START);
      return;
    }

    const timeout = setTimeout(() => {
      if (countdown <= 1) {
        beginPlaying();
        return;
      }
      setCountdown((current) => Math.max(1, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [beginPlaying, bodyVisible, countdown, status]);

  useEffect(() => {
    if (status !== 'playing' || size.width <= 0 || size.height <= 0) return;

    const interval = setInterval(() => {
      // Pose updates can arrive faster than this game loop. Read the newest
      // sample from a ref so those updates do not tear down and recreate the
      // interval before it gets a chance to move the bird.
      const nextDepth = smoothDepth(depthRef.current, latestDepthRef.current, 0.32);
      depthRef.current = nextDepth;
      const nextBirdY = mapDepthToBirdY(nextDepth, size.height, BIRD_SIZE);
      const birdLeft = 72 - BIRD_SIZE / 2;
      const birdRight = 72 + BIRD_SIZE / 2;
      const birdTop = nextBirdY;
      const birdBottom = nextBirdY + BIRD_SIZE;

      setElapsedMs(Date.now() - gameStartedAtRef.current);
      setTotalTicks((current) => current + 1);
      setVisibleTicks((current) => current + (poseVisibleRef.current || Platform.OS === 'web' ? 1 : 0));

      setPipes((current) => {
        let nextScore = score;
        let collided = false;
        const moved = current.map((pipe) => {
          const next = { ...pipe, x: pipe.x - PIPE_SPEED };
          const overlapsX = birdRight > next.x && birdLeft < next.x + PIPE_WIDTH;
          const insideGap = birdTop > next.gapY && birdBottom < next.gapY + PIPE_GAP;
          if (overlapsX && !insideGap) {
            collided = true;
          }
          if (!next.passed && next.x + PIPE_WIDTH < birdLeft) {
            next.passed = true;
            nextScore += 1;
          }
          return next;
        }).filter((pipe) => pipe.x + PIPE_WIDTH > -20);

        while (moved.length < 3) {
          const lastX = moved.length ? moved[moved.length - 1].x : size.width;
          moved.push(makePipe(pipeIdRef.current, lastX + PIPE_SPACING, size.height));
          pipeIdRef.current += 1;
        }

        if (nextScore !== score) {
          setScore(nextScore);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        if (collided) {
          finishGame(collided);
        }
        return moved;
      });
    }, GAME_TICK_MS);

    return () => clearInterval(interval);
  }, [finishGame, score, size.height, size.width, status]);

  useEffect(() => {
    if (status !== 'ended' || score <= bestScore) return;
    setBestScore(score);
    void AsyncStorage.setItem(BEST_SCORE_KEY, String(score)).catch(() => {});
  }, [bestScore, score, status]);

  useEffect(() => {
    scoreScale.setValue(1.34);
    scoreFlash.setValue(0.9);
    Animated.parallel([
      Animated.spring(scoreScale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 220,
        damping: 11,
        mass: 0.6,
      }),
      Animated.timing(scoreFlash, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [score, scoreFlash, scoreScale]);

  const startGame = useCallback(async () => {
    if (!canPlay) {
      const active = await requestSubscriptionAccess();
      if (!active) return;
    }

    if (Platform.OS !== 'web' && !permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) return;
    }

    endedRef.current = false;
    depthRef.current = 0.5;
    standingDepthRef.current = null;
    rawPoseDepthRef.current = 0;
    gameStartedAtRef.current = 0;
    pipeIdRef.current = 4;
    setPipes(makeInitialPipes(Math.max(size.width, 320), Math.max(size.height, 420)));
    setScore(0);
    setElapsedMs(0);
    setVisibleTicks(0);
    setTotalTicks(0);
    setCountdown(COUNTDOWN_START);
    setLastAward(0);
    setBanking(false);
    setStatus('countdown');
  }, [canPlay, permission?.granted, requestPermission, requestSubscriptionAccess, size.height, size.width]);

  const bankReward = useCallback(async () => {
    if (banking) return;
    const reward = calculateFlappySquatReward({
      durationSeconds: Math.floor(elapsedMs / 1000),
      visibilityRatio: totalTicks > 0 ? visibleTicks / totalTicks : 1,
    });
    if (!reward.qualified || reward.minutes <= 0) return;

    setBanking(true);
    await bankGameTime({
      minutes: reward.minutes,
      gameId: FLAPPY_SQUAT_GAME_ID,
      score,
      durationSeconds: Math.floor(elapsedMs / 1000),
    });
    setLastAward(reward.minutes);
    setBanking(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [bankGameTime, banking, elapsedMs, score, totalTicks, visibleTicks]);

  const rewardPreview = calculateFlappySquatReward({
    durationSeconds: Math.floor(elapsedMs / 1000),
    visibilityRatio: totalTicks > 0 ? visibleTicks / totalTicks : 1,
  });
  const previewPipes = makePreviewPipes(Math.max(size.width, 320));

  function handleGameLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  function exitGame() {
    if (status === 'playing') {
      finishGame(false);
      return;
    }
    endedRef.current = true;
    setStatus('idle');
  }

  return (
    <Screen scroll={!gameActive} flush={gameActive}>
      {gameActive ? (
        <View className="flex-1 bg-cocoa" onLayout={handleGameLayout} {...panResponder.panHandlers}>
          <View style={StyleSheet.absoluteFill}>
            <FlappyScene
              width={Math.max(size.width, 1)}
              height={Math.max(size.height, 1)}
              birdY={birdY}
              pipes={pipes}
            />
          </View>
          {permission?.granted && Platform.OS === 'ios' ? (
            <View pointerEvents="none" style={styles.posePreview}>
              <BootyPoseCameraView style={styles.cameraFill} />
              <PoseOverlay
                landmarks={pose.landmarks}
                phase={pose.phase}
                visible={pose.visible}
                frameWidth={pose.frameWidth}
                frameHeight={pose.frameHeight}
              />
            </View>
          ) : null}
          {permission?.granted && Platform.OS !== 'ios' && Platform.OS !== 'web' ? (
            <View pointerEvents="none" style={styles.posePreview}>
              <CameraView active facing="front" mirror style={styles.cameraFill} />
            </View>
          ) : null}
          {status === 'playing' ? (
            <View pointerEvents="none" style={styles.scoreContainer}>
              <View style={styles.scoreWrap}>
                <AnimatedText
                  accessibilityLabel={`Score ${score}`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.scoreNumber, { transform: [{ scale: scoreScale }] }]}
                >
                  {score}
                </AnimatedText>
                <AnimatedText
                  pointerEvents="none"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.scoreNumber,
                    styles.scoreNumberFlash,
                    { opacity: scoreFlash, transform: [{ scale: scoreScale }] },
                  ]}
                >
                  {score}
                </AnimatedText>
              </View>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End game"
            onPress={exitGame}
            className="absolute right-5 top-12 h-11 w-11 items-center justify-center rounded-full bg-cocoa/55"
          >
            <X size={22} stroke={colors.white} strokeWidth={2.5} />
          </Pressable>
          {status === 'countdown' ? (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center px-8">
              <View className="min-w-[280px] items-center rounded-[30px] bg-cocoa/50 px-8 py-8">
                <Text
                  className={bodyVisible
                    ? 'text-[116px] font-black leading-[122px] text-white'
                    : 'text-center text-[58px] font-black leading-[64px] tracking-tight text-white'}
                >
                  {bodyVisible ? countdown : 'STEP BACK'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View className="flex-1">
          <Header title="Games" />

          <Animated.View
            style={[
              styles.launcher,
              {
                opacity: launcherEntrance,
                transform: [{
                  translateY: launcherEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
                }],
              },
            ]}
          >
            <View style={styles.gameHero} onLayout={handleGameLayout}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    transform: [
                      { scale: previewDrift.interpolate({ inputRange: [0, 1], outputRange: [1.01, 1.035] }) },
                      { translateY: previewDrift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                    ],
                  },
                ]}
              >
                <FlappyScene
                  width={Math.max(size.width, 1)}
                  height={360}
                  birdY={mapDepthToBirdY(0.48, 360, BIRD_SIZE)}
                  pipes={previewPipes}
                />
              </Animated.View>
              <LinearGradient
                colors={['rgba(58,31,44,0.02)', 'rgba(58,31,44,0.08)', 'rgba(58,31,44,0.76)']}
                locations={[0, 0.58, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.bestBadge}>
                <Trophy size={14} stroke={colors.white} strokeWidth={2.5} />
                <Text style={styles.bestBadgeText}>Best {bestScore}</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Flappy Squat</Text>
                <Text style={styles.heroSubtitle}>Stand to rise. Squat to dive.</Text>
                <View style={styles.heroAction}>
                  <Button
                    label={status === 'ended' ? 'Play again' : 'Play'}
                    icon={Play}
                    onPress={startGame}
                  />
                </View>
              </View>
            </View>

            {status === 'ended' ? (
              <View style={styles.gameDetails}>
                <View style={styles.result}>
                  <View className="flex-row items-center gap-3">
                    <Trophy size={24} stroke={colors.raspberry} strokeWidth={2.5} />
                    <View className="flex-1">
                      <Text className="text-lg font-black text-cocoa">Score {score}</Text>
                      <Text className="mt-1 text-sm font-bold text-mink">
                        {lastAward > 0
                          ? `${lastAward} minutes added to your bank.`
                          : rewardPreview.qualified
                            ? `${rewardPreview.minutes} minutes ready to bank.`
                            : rewardPreview.reason === 'poor_visibility'
                              ? 'Stay visible for most of the round to earn minutes.'
                              : 'Last at least 30 seconds to bank minutes.'}
                      </Text>
                    </View>
                  </View>
                  {rewardPreview.qualified && lastAward <= 0 ? (
                    <View style={styles.bankAction}>
                      <Button label={`Bank ${rewardPreview.minutes} min`} icon={Activity} loading={banking} onPress={bankReward} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </Animated.View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bankAction: {
    marginTop: 16,
  },
  bestBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,31,44,0.48)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    right: 16,
    top: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  bestBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  cameraFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gameDetails: {
    paddingTop: 18,
  },
  launcher: {
    borderRadius: 32,
  },
  gameHero: {
    backgroundColor: colors.cocoa,
    borderRadius: 30,
    height: 360,
    overflow: 'hidden',
  },
  heroCopy: {
    bottom: 20,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  heroAction: {
    marginTop: 18,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.3,
    lineHeight: 39,
  },
  posePreview: {
    position: 'absolute',
    right: 18,
    bottom: 32,
    width: 144,
    height: 216,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: colors.cocoa,
  },
  scoreContainer: {
    alignItems: 'center',
    left: 64,
    position: 'absolute',
    right: 64,
    top: 38,
  },
  scoreNumber: {
    color: colors.white,
    fontSize: 128,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 136,
    textAlign: 'center',
    textShadowColor: 'rgba(58, 31, 44, 0.72)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  scoreNumberFlash: {
    color: colors.lime,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  result: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: 16,
  },
});
