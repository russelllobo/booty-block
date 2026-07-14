import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowDown, Play, Sparkles, Trophy, X } from 'lucide-react-native';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

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

type GameResultNotice = {
  score: number;
  message: string;
  xp: number;
};

const BEST_SCORE_KEY = 'bootyblock:flappy-squat-best';
const GAME_TICK_MS = 40;
const BIRD_SIZE = 42;
const PIPE_WIDTH = 68;
const PIPE_GAP = 152;
const PIPE_SPACING = 210;
const PIPE_SPEED = 4.2;
const COUNTDOWN_START = 3;
const PREVIEW_HEIGHT = 380;

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
  return [makePipe(1, Math.max(180, width * 0.6), PREVIEW_HEIGHT)];
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
  const skylineY = Math.max(120, groundY - 72);
  const birdCenterY = birdY + BIRD_SIZE / 2;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#71C8FF" />
          <Stop offset="0.55" stopColor="#B8E8FF" />
          <Stop offset="1" stopColor="#FFE1DB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="sunGlow" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFF7B2" />
          <Stop offset="1" stopColor="#FFB46E" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pipe" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#321626" />
          <Stop offset="0.56" stopColor="#5A2944" />
          <Stop offset="1" stopColor="#2B1422" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pipeCap" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FF7EB6" />
          <Stop offset="1" stopColor="#D92D79" />
        </SvgLinearGradient>
        <SvgLinearGradient id="peach" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFCC86" />
          <Stop offset="0.52" stopColor="#FF8E9E" />
          <Stop offset="1" stopColor="#F65383" />
        </SvgLinearGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#sky)" />
      <Circle cx={width - 48} cy={54} r={43} fill="#FFF7B2" opacity={0.2} />
      <Circle cx={width - 48} cy={54} r={29} fill="url(#sunGlow)" />
      <Circle cx={width - 57} cy={45} r={8} fill="#FFFFFF" opacity={0.34} />

      <G opacity={0.78}>
        <Ellipse cx={Math.max(58, width * 0.18)} cy={70} rx={35} ry={10} fill="#FFFFFF" />
        <Circle cx={Math.max(47, width * 0.18 - 12)} cy={65} r={13} fill="#FFFFFF" />
        <Circle cx={Math.max(69, width * 0.18 + 10)} cy={63} r={16} fill="#FFFFFF" />
        <Ellipse cx={Math.max(190, width * 0.54)} cy={126} rx={27} ry={8} fill="#FFFFFF" opacity={0.76} />
        <Circle cx={Math.max(180, width * 0.54 - 9)} cy={121} r={10} fill="#FFFFFF" opacity={0.76} />
      </G>

      <Path
        d={`M0 ${skylineY + 28} C ${width * 0.14} ${skylineY - 18}, ${width * 0.31} ${skylineY + 18}, ${width * 0.47} ${skylineY - 20} S ${width * 0.72} ${skylineY + 12}, ${width} ${skylineY - 10} L ${width} ${groundY} L 0 ${groundY} Z`}
        fill="#B9B5ED"
        opacity={0.72}
      />
      <Path
        d={`M0 ${groundY - 40} C ${width * 0.2} ${groundY - 77}, ${width * 0.34} ${groundY - 17}, ${width * 0.53} ${groundY - 55} S ${width * 0.82} ${groundY - 18}, ${width} ${groundY - 48} L ${width} ${groundY} L 0 ${groundY} Z`}
        fill="#FFB7D2"
      />
      <Path
        d={`M0 ${groundY - 16} C ${width * 0.19} ${groundY - 42}, ${width * 0.43} ${groundY + 4}, ${width * 0.68} ${groundY - 24} S ${width * 0.9} ${groundY - 2}, ${width} ${groundY - 18} L ${width} ${height} L 0 ${height} Z`}
        fill="#8DE6B1"
      />
      <Path
        d={`M0 ${groundY + 3} C ${width * 0.24} ${groundY - 10}, ${width * 0.48} ${groundY + 16}, ${width * 0.72} ${groundY + 1} S ${width * 0.9} ${groundY + 12}, ${width} ${groundY + 4}`}
        fill="none"
        stroke="#D6FFD9"
        strokeWidth={5}
        opacity={0.72}
      />
      {pipes.map((pipe) => (
        <Fragment key={pipe.id}>
          <Rect x={pipe.x + 7} y={0} width={PIPE_WIDTH} height={pipe.gapY} rx={15} fill="#26101D" opacity={0.2} />
          <Rect x={pipe.x} y={-12} width={PIPE_WIDTH} height={pipe.gapY + 12} rx={15} fill="url(#pipe)" />
          <Rect x={pipe.x + 8} y={0} width={10} height={Math.max(0, pipe.gapY - 18)} rx={5} fill="#FFFFFF" opacity={0.09} />
          <Rect x={pipe.x - 9} y={pipe.gapY - 20} width={PIPE_WIDTH + 18} height={29} rx={14} fill="#9D1D59" opacity={0.24} />
          <Rect x={pipe.x - 9} y={pipe.gapY - 23} width={PIPE_WIDTH + 18} height={27} rx={13} fill="url(#pipeCap)" />
          <Rect x={pipe.x + 2} y={pipe.gapY - 18} width={PIPE_WIDTH - 4} height={5} rx={2.5} fill="#FFFFFF" opacity={0.28} />
          <Circle cx={pipe.x + 4} cy={pipe.gapY - 9} r={3} fill="#FFD5E7" opacity={0.82} />
          <Circle cx={pipe.x + PIPE_WIDTH - 4} cy={pipe.gapY - 9} r={3} fill="#FFD5E7" opacity={0.82} />

          <Rect x={pipe.x + 7} y={pipe.gapY + PIPE_GAP} width={PIPE_WIDTH} height={height - pipe.gapY - PIPE_GAP} rx={15} fill="#26101D" opacity={0.2} />
          <Rect x={pipe.x} y={pipe.gapY + PIPE_GAP} width={PIPE_WIDTH} height={height - pipe.gapY - PIPE_GAP + 12} rx={15} fill="url(#pipe)" />
          <Rect x={pipe.x + 8} y={pipe.gapY + PIPE_GAP + 20} width={10} height={Math.max(0, height - pipe.gapY - PIPE_GAP - 20)} rx={5} fill="#FFFFFF" opacity={0.09} />
          <Rect x={pipe.x - 9} y={pipe.gapY + PIPE_GAP - 5} width={PIPE_WIDTH + 18} height={29} rx={14} fill="#9D1D59" opacity={0.24} />
          <Rect x={pipe.x - 9} y={pipe.gapY + PIPE_GAP - 8} width={PIPE_WIDTH + 18} height={27} rx={13} fill="url(#pipeCap)" />
          <Rect x={pipe.x + 2} y={pipe.gapY + PIPE_GAP - 3} width={PIPE_WIDTH - 4} height={5} rx={2.5} fill="#FFFFFF" opacity={0.28} />
          <Circle cx={pipe.x + 4} cy={pipe.gapY + PIPE_GAP + 6} r={3} fill="#FFD5E7" opacity={0.82} />
          <Circle cx={pipe.x + PIPE_WIDTH - 4} cy={pipe.gapY + PIPE_GAP + 6} r={3} fill="#FFD5E7" opacity={0.82} />
        </Fragment>
      ))}

      <G>
        <Ellipse cx={72} cy={birdCenterY + 5} rx={25} ry={20} fill="#3A1F2C" opacity={0.15} />
        <Path d={`M52 ${birdCenterY + 1} C 31 ${birdCenterY - 14}, 27 ${birdCenterY + 17}, 54 ${birdCenterY + 13}`} fill="#E73A79" />
        <Path d={`M48 ${birdCenterY + 2} C 37 ${birdCenterY - 5}, 36 ${birdCenterY + 8}, 50 ${birdCenterY + 10}`} fill="#FFB4D0" opacity={0.62} />
        <Circle cx={72} cy={birdCenterY} r={BIRD_SIZE / 2} fill="url(#peach)" />
        <Path d={`M66 ${birdCenterY - 20} C 65 ${birdCenterY - 29}, 73 ${birdCenterY - 34}, 78 ${birdCenterY - 25}`} fill="none" stroke="#5A2944" strokeWidth={3.5} strokeLinecap="round" />
        <Path d={`M74 ${birdCenterY - 24} C 82 ${birdCenterY - 31}, 92 ${birdCenterY - 27}, 89 ${birdCenterY - 20} C 83 ${birdCenterY - 18}, 78 ${birdCenterY - 20}, 74 ${birdCenterY - 24} Z`} fill="#67C98A" />
        <Path d={`M53 ${birdCenterY - 8} C 65 ${birdCenterY - 13}, 80 ${birdCenterY - 13}, 92 ${birdCenterY - 7} L 91 ${birdCenterY - 1} C 78 ${birdCenterY - 6}, 64 ${birdCenterY - 6}, 53 ${birdCenterY - 1} Z`} fill="#FFF4B8" />
        <Path d={`M83 ${birdCenterY - 6} L95 ${birdCenterY - 11} L91 ${birdCenterY + 1} Z`} fill="#FFF4B8" />
        <Circle cx={80} cy={birdCenterY + 1} r={6} fill="#FFFFFF" />
        <Circle cx={82} cy={birdCenterY + 1} r={2.6} fill="#3A1F2C" />
        <Circle cx={81.2} cy={birdCenterY} r={0.8} fill="#FFFFFF" />
        <Path d={`M92 ${birdCenterY + 7} L111 ${birdCenterY + 1} L104 ${birdCenterY + 13} Z`} fill="#FFD45E" />
        <Path d={`M69 ${birdCenterY + 10} C 75 ${birdCenterY + 15}, 82 ${birdCenterY + 14}, 85 ${birdCenterY + 10}`} fill="none" stroke="#8C294E" strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={61} cy={birdCenterY + 7} r={4.5} fill="#FFCFBE" opacity={0.65} />
        <Path d={`M61 ${birdCenterY + 19} L58 ${birdCenterY + 25}`} stroke="#8C294E" strokeWidth={2.5} strokeLinecap="round" />
        <Path d={`M78 ${birdCenterY + 19} L81 ${birdCenterY + 25}`} stroke="#8C294E" strokeWidth={2.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export default function Games() {
  const {
    earnGamePeaches,
    syncUsageWindow,
    subscriptionHydrated,
    isSubscribed,
    requestSubscriptionAccess,
  } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<GameStatus>('idle');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [resultNotice, setResultNotice] = useState<GameResultNotice | null>(null);
  const [simulatedDepth, setSimulatedDepth] = useState(0.5);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [hasMovedLower, setHasMovedLower] = useState(false);
  const depthRef = useRef(0.5);
  const latestDepthRef = useRef(0.5);
  const scoreRef = useRef(0);
  const pipeIdRef = useRef(4);
  const gameStartedAtRef = useRef(0);
  const endedRef = useRef(false);
  const launcherEntrance = useRef(new Animated.Value(0)).current;
  const gameEntrance = useRef(new Animated.Value(0)).current;
  const previewDrift = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const scoreFlash = useRef(new Animated.Value(0)).current;
  const resultNoticeProgress = useRef(new Animated.Value(0)).current;
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
  // Native pose depth is already calibrated from standing (0) to a full
  // squat (1). Re-normalizing it against a second standing sample can flatten
  // the entire input range and leave the bird pinned in place.
  latestDepthRef.current = rawDepth;
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
    syncUsageWindow();
  }, [syncUsageWindow]);

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
      gameEntrance.setValue(0);
      router.setParams({ hideTabs: undefined });
      return;
    }

    router.setParams({ hideTabs: '1' });
    gameEntrance.setValue(0);
    const entrance = Animated.timing(gameEntrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrance.start();

    return () => {
      entrance.stop();
      router.setParams({ hideTabs: undefined });
    };
  }, [gameActive, gameEntrance]);

  const finishGame = useCallback((crashed: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus('ended');
    const finalScore = scoreRef.current;
    const reward = calculateFlappySquatReward({ score: finalScore });
    const durationSeconds = Math.max(0, Math.floor((Date.now() - gameStartedAtRef.current) / 1000));

    if (reward.peaches > 0) {
      void earnGamePeaches({
        peaches: reward.peaches,
        gameId: FLAPPY_SQUAT_GAME_ID,
        score: finalScore,
        durationSeconds,
      }).then((result) => {
        setResultNotice({
          score: finalScore,
          message: `${reward.peaches} Peaches added to your wallet`,
          xp: result.xpAwarded,
        });
      }).catch(() => {
        setResultNotice({ score: finalScore, message: 'Reward could not be added', xp: 0 });
      });
    } else {
      setResultNotice({ score: finalScore, message: 'Score a point to earn rewards', xp: 0 });
    }

    if (crashed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [earnGamePeaches]);

  const beginPlaying = useCallback(() => {
    if (endedRef.current) return;
    // Always open at the standing/top position. The game loop immediately
    // follows live pose depth from here, so squatting still moves the bird.
    depthRef.current = 0;
    gameStartedAtRef.current = Date.now();
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
          scoreRef.current = nextScore;
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
    if (!resultNotice) return;

    resultNoticeProgress.setValue(0);
    const animation = Animated.sequence([
      Animated.spring(resultNoticeProgress, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 260,
        damping: 22,
        mass: 0.8,
      }),
      Animated.delay(2800),
      Animated.timing(resultNoticeProgress, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setResultNotice(null);
    });

    return () => animation.stop();
  }, [resultNotice, resultNoticeProgress]);

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

  useEffect(() => {
    if (status !== 'playing' || hasMovedLower) return;

    const movedLower = Platform.OS === 'web'
      ? simulatedDepth >= 0.62
      : latestDepthRef.current >= 0.12;

    if (movedLower) setHasMovedLower(true);
  }, [hasMovedLower, pose.metrics.depth, simulatedDepth, status]);

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
    gameStartedAtRef.current = 0;
    pipeIdRef.current = 4;
    scoreRef.current = 0;
    setPipes(makeInitialPipes(Math.max(size.width, 320), Math.max(size.height, 420)));
    setScore(0);
    setCountdown(COUNTDOWN_START);
    setHasMovedLower(false);
    setResultNotice(null);
    setStatus('countdown');
  }, [canPlay, permission?.granted, requestPermission, requestSubscriptionAccess, size.height, size.width]);

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
    <Screen scroll={!gameActive} flush={gameActive} backgroundColor={gameActive ? '#71C8FF' : undefined}>
      {gameActive ? (
        <Animated.View
          className="flex-1"
          onLayout={handleGameLayout}
          style={{
            opacity: gameEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            transform: [{ translateY: gameEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
          {...panResponder.panHandlers}
        >
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
              {!hasMovedLower ? (
                <View style={styles.scorePrompt}>
                  <Text style={styles.scorePromptText}>GO LOWER</Text>
                  <ArrowDown size={32} stroke={colors.white} strokeWidth={3} />
                </View>
              ) : null}
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
        </Animated.View>
      ) : (
        <View className="flex-1">
          <Header title="Games" subtitle="Earn Peaches by playing games" />

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
                  height={PREVIEW_HEIGHT}
                  birdY={mapDepthToBirdY(0.42, PREVIEW_HEIGHT, BIRD_SIZE)}
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
              <View style={styles.controlBadge}>
                <Sparkles size={13} stroke={colors.cocoa} strokeWidth={2.6} />
                <Text style={styles.controlBadgeText}>SQUAT CONTROLLED</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Flappy Squat</Text>
                <Text style={styles.heroSubtitle}>Lower your body. Thread the gap.</Text>
                <View style={styles.heroAction}>
                  <Button
                    label={status === 'ended' ? 'Play again' : 'Play'}
                    icon={Play}
                    onPress={startGame}
                  />
                </View>
              </View>
            </View>

          </Animated.View>

          {resultNotice ? (
            <Animated.View
              accessibilityLiveRegion="polite"
              style={[
                styles.resultNotice,
                {
                  opacity: resultNoticeProgress,
                  transform: [{
                    translateY: resultNoticeProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [120, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.resultNoticeIcon}>
                <Sparkles size={22} stroke={colors.cocoa} strokeWidth={3} />
              </View>
              <View className="flex-1">
                <Text style={styles.resultNoticeScore}>
                  {resultNotice.xp > 0 ? `+${resultNotice.xp} XP` : `Score ${resultNotice.score}`}
                </Text>
                <Text style={styles.resultNoticeMessage}>{resultNotice.message}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  launcher: {
    borderRadius: 32,
    elevation: 9,
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
  },
  gameHero: {
    backgroundColor: '#71C8FF',
    borderRadius: 30,
    borderColor: 'rgba(255,255,255,0.72)',
    borderWidth: 2,
    height: PREVIEW_HEIGHT,
    overflow: 'hidden',
  },
  controlBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 178, 0.92)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    left: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    position: 'absolute',
    top: 16,
  },
  controlBadgeText: {
    color: colors.cocoa,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.45,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    textShadowColor: 'rgba(58,31,44,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.3,
    lineHeight: 39,
    textShadowColor: 'rgba(58,31,44,0.48)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 9,
  },
  posePreview: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 190,
    height: 285,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: '#71C8FF',
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
  scorePrompt: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    left: '50%',
    marginLeft: 42,
    position: 'absolute',
    top: 104,
  },
  scorePromptText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(58, 31, 44, 0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  resultNotice: {
    alignItems: 'center',
    backgroundColor: colors.cocoa,
    borderRadius: 22,
    bottom: 8,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
    shadowColor: colors.cocoa,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 20,
  },
  resultNoticeIcon: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  resultNoticeMessage: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  resultNoticeScore: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
