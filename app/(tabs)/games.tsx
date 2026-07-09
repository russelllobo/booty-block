import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Activity, Camera, Gamepad2, Play, Timer, Trophy, X } from 'lucide-react-native';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { PoseOverlay } from '../../components/PoseOverlay';
import { Screen } from '../../components/Screen';
import {
  calculateFlappySquatReward,
  clamp,
  FLAPPY_SQUAT_DAILY_CAP_MINUTES,
  FLAPPY_SQUAT_GAME_ID,
  mapDepthToBirdY,
  smoothDepth,
} from '../../lib/games/flappySquat';
import { usePoseSession } from '../../lib/services/pose';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../../modules/booty-pose/src/BootyPoseCameraView';
import { colors, shadow } from '../../constants/theme';

type Pipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

type GameStatus = 'idle' | 'playing' | 'ended';

const BEST_SCORE_KEY = 'bootyblock:flappy-squat-best';
const GAME_TICK_MS = 40;
const BIRD_SIZE = 42;
const PIPE_WIDTH = 68;
const PIPE_GAP = 152;
const PIPE_SPACING = 210;
const PIPE_SPEED = 4.2;
const START_SECONDS = 45;

function formatBankDuration(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function sameLocalDay(left: number, right: number) {
  const a = new Date(left);
  const b = new Date(right);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

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

function calculateDepthFromPose(depth: number, visible: boolean, fallback: number) {
  if (!visible) return fallback;
  return clamp(depth, 0, 1);
}

function FlappyScene({
  width,
  height,
  birdY,
  pipes,
  score,
  secondsLeft,
}: {
  width: number;
  height: number;
  birdY: number;
  pipes: Pipe[];
  score: number;
  secondsLeft: number;
}) {
  const groundY = height - 28;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#7AD7FF" />
          <Stop offset="1" stopColor="#FFF1F6" />
        </LinearGradient>
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
      <Rect x={14} y={14} width={102} height={38} rx={19} fill="rgba(58,31,44,0.28)" />
      <Rect x={width - 116} y={14} width={102} height={38} rx={19} fill="rgba(58,31,44,0.28)" />
      <Path d="M34 34 L42 24 L50 34 Z" fill="#FFFFFF" opacity={0.92} />
      <Rect x={58} y={25} width={36} height={18} rx={9} fill="#FFFFFF" opacity={0.92} />
      <Path d={`M${width - 86} 24 A10 10 0 1 1 ${width - 86} 44 A10 10 0 1 1 ${width - 86} 24`} fill="#FFFFFF" opacity={0.92} />
    </Svg>
  );
}

export default function Games() {
  const {
    timeBankSeconds,
    unlockHistory,
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
  const [secondsLeft, setSecondsLeft] = useState(START_SECONDS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [visibleTicks, setVisibleTicks] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [banking, setBanking] = useState(false);
  const [lastAward, setLastAward] = useState(0);
  const [simulatedDepth, setSimulatedDepth] = useState(0.5);
  const depthRef = useRef(0.5);
  const pipeIdRef = useRef(4);
  const gameStartedAtRef = useRef(0);
  const endedRef = useRef(false);
  const nativePoseActive = status === 'playing' && Boolean(permission?.granted);
  const pose = usePoseSession({ target: 999, active: nativePoseActive });
  const todayGameMinutes = useMemo(() => {
    const now = Date.now();
    return unlockHistory
      .filter((entry) => entry.source === 'game' && sameLocalDay(entry.completedAt, now))
      .reduce((sum, entry) => sum + entry.minutes, 0);
  }, [unlockHistory]);
  const dailyRemaining = Math.max(0, FLAPPY_SQUAT_DAILY_CAP_MINUTES - todayGameMinutes);
  const depth = calculateDepthFromPose(pose.metrics.depth, pose.visible, simulatedDepth);
  const birdY = mapDepthToBirdY(depthRef.current, size.height, BIRD_SIZE);
  const canPlay = subscriptionHydrated && isSubscribed;

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
    void AsyncStorage.getItem(BEST_SCORE_KEY)
      .then((stored) => {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) setBestScore(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'playing') {
      router.setParams({ hideTabs: undefined });
      return;
    }

    router.setParams({ hideTabs: '1' });
    return () => router.setParams({ hideTabs: undefined });
  }, [status]);

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

  useEffect(() => {
    if (status !== 'playing' || size.width <= 0 || size.height <= 0) return;

    const interval = setInterval(() => {
      const nextDepth = smoothDepth(depthRef.current, depth, 0.24);
      depthRef.current = nextDepth;
      const nextBirdY = mapDepthToBirdY(nextDepth, size.height, BIRD_SIZE);
      const birdLeft = 72 - BIRD_SIZE / 2;
      const birdRight = 72 + BIRD_SIZE / 2;
      const birdTop = nextBirdY;
      const birdBottom = nextBirdY + BIRD_SIZE;

      setElapsedMs(Date.now() - gameStartedAtRef.current);
      setSecondsLeft(Math.max(0, START_SECONDS - Math.floor((Date.now() - gameStartedAtRef.current) / 1000)));
      setTotalTicks((current) => current + 1);
      setVisibleTicks((current) => current + (pose.visible || Platform.OS === 'web' ? 1 : 0));

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
        if (collided || Date.now() - gameStartedAtRef.current >= START_SECONDS * 1000) {
          finishGame(collided);
        }
        return moved;
      });
    }, GAME_TICK_MS);

    return () => clearInterval(interval);
  }, [depth, finishGame, pose.visible, score, size.height, size.width, status]);

  useEffect(() => {
    if (status !== 'ended' || score <= bestScore) return;
    setBestScore(score);
    void AsyncStorage.setItem(BEST_SCORE_KEY, String(score)).catch(() => {});
  }, [bestScore, score, status]);

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
    gameStartedAtRef.current = Date.now();
    pipeIdRef.current = 4;
    setPipes(makeInitialPipes(Math.max(size.width, 320), Math.max(size.height, 420)));
    setScore(0);
    setElapsedMs(0);
    setSecondsLeft(START_SECONDS);
    setVisibleTicks(0);
    setTotalTicks(0);
    setLastAward(0);
    setBanking(false);
    setStatus('playing');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [canPlay, permission?.granted, requestPermission, requestSubscriptionAccess, size.height, size.width]);

  const bankReward = useCallback(async () => {
    if (banking) return;
    const reward = calculateFlappySquatReward({
      durationSeconds: Math.floor(elapsedMs / 1000),
      visibilityRatio: totalTicks > 0 ? visibleTicks / totalTicks : 1,
      alreadyEarnedTodayMinutes: todayGameMinutes,
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
  }, [bankGameTime, banking, elapsedMs, score, todayGameMinutes, totalTicks, visibleTicks]);

  const rewardPreview = calculateFlappySquatReward({
    durationSeconds: Math.floor(elapsedMs / 1000),
    visibilityRatio: totalTicks > 0 ? visibleTicks / totalTicks : 1,
    alreadyEarnedTodayMinutes: todayGameMinutes,
  });

  function handleGameLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    if (pipes.length === 0) {
      setPipes(makeInitialPipes(width, height));
    }
  }

  return (
    <Screen scroll={status !== 'playing'} flush={status === 'playing'}>
      {status === 'playing' ? (
        <View className="flex-1 bg-cocoa" onLayout={handleGameLayout} {...panResponder.panHandlers}>
          <View style={StyleSheet.absoluteFill}>
            <FlappyScene
              width={Math.max(size.width, 1)}
              height={Math.max(size.height, 1)}
              birdY={birdY}
              pipes={pipes}
              score={score}
              secondsLeft={secondsLeft}
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
          <View className="absolute left-5 right-5 top-12 flex-row items-center justify-between">
            <View className="rounded-full bg-cocoa/55 px-4 py-2">
              <Text className="text-sm font-black text-white">Score {score}</Text>
            </View>
            <View className="rounded-full bg-cocoa/55 px-4 py-2">
              <Text className="text-sm font-black text-white">{secondsLeft}s</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End game"
              onPress={() => finishGame(false)}
              className="h-11 w-11 items-center justify-center rounded-full bg-cocoa/55"
            >
              <X size={22} stroke={colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>
          <View pointerEvents="none" className="absolute bottom-12 left-6 right-6 rounded-[24px] bg-cocoa/35 px-5 py-4">
            <Text className="text-center text-sm font-black uppercase tracking-wide text-white">
              {Platform.OS === 'web' ? 'Drag up and down to preview squat control' : pose.visible ? 'Squat lower to drop. Stand taller to rise.' : 'Step back until your whole body is visible.'}
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <Header
            title="Games"
            subtitle="Play squat-controlled classics to bank minutes."
            rightAccessory={(
              <View className="rounded-full bg-white/75 px-3 py-2">
                <Text className="text-sm font-black text-cocoa">{formatBankDuration(timeBankSeconds)}</Text>
              </View>
            )}
          />

          <View className="mb-4 rounded-[28px] border border-white/80 bg-white/75 p-5" style={shadow}>
            <View className="flex-row items-center justify-between gap-4">
              <View>
                <Text className="text-xs font-black uppercase tracking-wide text-mink">Banked minutes</Text>
                <Text className="mt-1 text-[44px] font-black leading-[50px] text-cocoa">
                  {Math.floor(timeBankSeconds / 60)}
                </Text>
              </View>
              <View className="h-16 w-16 items-center justify-center rounded-full bg-mint">
                <Timer size={30} stroke={colors.cocoa} strokeWidth={2.6} />
              </View>
            </View>
          </View>

          <View className="overflow-hidden rounded-[30px] border border-white/80 bg-white" style={shadow}>
            <View className="h-[260px] overflow-hidden bg-cocoa" onLayout={handleGameLayout}>
              <FlappyScene
                width={Math.max(size.width, 1)}
                height={260}
                birdY={mapDepthToBirdY(0.48, 260, BIRD_SIZE)}
                pipes={pipes}
                score={status === 'ended' ? score : bestScore}
                secondsLeft={secondsLeft}
              />
              <View className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2">
                <Text className="text-sm font-black text-cocoa">Flappy Squat</Text>
              </View>
            </View>

            <View className="p-5">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
                  <Gamepad2 size={25} stroke={colors.raspberry} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-[22px] font-black leading-[27px] text-cocoa">Flappy Squat</Text>
                  <Text className="mt-1 text-sm font-bold leading-5 text-mink">
                    Your squat depth controls the bird. Stay in frame, dodge pipes, bank minutes.
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-blush px-4 py-3">
                  <Text className="text-xs font-black uppercase tracking-wide text-mink">Best</Text>
                  <Text className="mt-1 text-2xl font-black text-cocoa">{bestScore}</Text>
                </View>
                <View className="flex-1 rounded-2xl bg-mint px-4 py-3">
                  <Text className="text-xs font-black uppercase tracking-wide text-mink">Today left</Text>
                  <Text className="mt-1 text-2xl font-black text-cocoa">{dailyRemaining}m</Text>
                </View>
              </View>

              {status === 'ended' ? (
                <View className="mt-5 rounded-3xl bg-cream p-4">
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
                              : rewardPreview.reason === 'daily_cap'
                                ? 'Daily game minutes are maxed out.'
                                : 'Last at least 30 seconds to bank minutes.'}
                      </Text>
                    </View>
                  </View>
                  {rewardPreview.qualified && lastAward <= 0 ? (
                    <View className="mt-4">
                      <Button label={`Bank ${rewardPreview.minutes} min`} icon={Activity} loading={banking} onPress={bankReward} />
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View className="mt-5 gap-3">
                <Button
                  label={status === 'ended' ? 'Play again' : 'Play'}
                  icon={Play}
                  onPress={startGame}
                  disabled={dailyRemaining <= 0}
                />
                {Platform.OS !== 'web' && !permission?.granted ? (
                  <Button label="Allow camera" icon={Camera} variant="secondary" onPress={requestPermission} />
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}
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
  },
  posePreview: {
    position: 'absolute',
    right: 18,
    bottom: 112,
    width: 96,
    height: 144,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: colors.cocoa,
  },
});
