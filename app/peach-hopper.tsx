import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowUp, Gamepad2, RotateCcw, Sparkles, Trophy, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '../components/AppText';
import { Button } from '../components/Button';
import {
  HopperPlatform,
  PeachHopperScene,
} from '../components/games/PeachHopperScene';
import { PoseOverlay } from '../components/PoseOverlay';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import {
  calculateSquatCalibrationProgress,
  isSquatCalibrationComplete,
  normalizeCalibratedPoseDepth,
} from '../lib/games/flappySquat';
import {
  calculateLaunchVelocity,
  calculatePeachHopperReward,
  canReleaseHopperJump,
  clampHopper,
  HOPPER_GRAVITY,
  HOPPER_PLATFORM_HEIGHT,
  HOPPER_PLAYER_SIZE,
  PEACH_HOPPER_BEST_SCORE_KEY,
  PEACH_HOPPER_GAME_ID,
} from '../lib/games/peachHopper';
import { usePoseSession } from '../lib/services/pose';
import { useBootyblock } from '../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../modules/booty-pose/src/BootyPoseCameraView';

type GameStatus =
  | 'idle'
  | 'calibratingStanding'
  | 'calibratingSquat'
  | 'calibratingReturn'
  | 'countdown'
  | 'playing'
  | 'ended';

type HopperWorld = {
  playerY: number;
  velocityY: number;
  groundedPlatformId: number | null;
  charge: number;
  platforms: HopperPlatform[];
  frame: number;
};

type GameResult = {
  score: number;
  collectedPeaches: number;
  earnedPeaches: number;
  xp: number;
  message: string;
};

const GAME_TICK_MS = 32;
const COUNTDOWN_START = 3;
const STANDING_CALIBRATION_SAMPLES = 1;
const RETURN_STANDING_SAMPLES = 1;
const MIN_CALIBRATION_RANGE = 0.12;
const STARTING_POSE_THRESHOLD = 0.16;
const PLATFORM_SPACING = 124;
const PLAYER_LANE_PADDING = 20;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
  return sorted[middle];
}

function platformWidthForId(id: number) {
  return 104 + ((id * 17) % 34);
}

function makePlatform(id: number, y: number, screenWidth: number, visited = false): HopperPlatform {
  const width = platformWidthForId(id);
  const maxX = Math.max(PLAYER_LANE_PADDING, screenWidth - width - PLAYER_LANE_PADDING);
  const centerOffset = ((id * 29) % 70) - 35;
  const x = clampHopper(
    screenWidth / 2 - width / 2 + centerOffset,
    PLAYER_LANE_PADDING,
    maxX,
  );
  const speed = 22 + ((id * 11) % 18);

  return {
    id,
    x,
    y,
    width,
    velocityX: id === 0 ? 0 : (id % 2 === 0 ? speed : -speed),
    visited,
    hasCollectible: id > 0 && id % 3 === 0,
    collected: false,
  };
}

function createInitialWorld(width: number, height: number): HopperWorld {
  const baseY = height - 98;
  const baseWidth = 152;
  const basePlatform: HopperPlatform = {
    id: 0,
    x: width / 2 - baseWidth / 2,
    y: baseY,
    width: baseWidth,
    velocityX: 0,
    visited: true,
    hasCollectible: false,
    collected: false,
  };
  const platforms = [basePlatform];

  for (let id = 1; id <= 7; id += 1) {
    platforms.push(makePlatform(id, baseY - id * PLATFORM_SPACING, width));
  }

  return {
    playerY: baseY - HOPPER_PLAYER_SIZE,
    velocityY: 0,
    groundedPlatformId: 0,
    charge: 0,
    platforms,
    frame: 0,
  };
}

function movePlatforms(platforms: HopperPlatform[], width: number, deltaSeconds: number) {
  return platforms.map((platform) => {
    if (platform.velocityX === 0) return platform;

    let x = platform.x + platform.velocityX * deltaSeconds;
    let velocityX = platform.velocityX;
    const minX = PLAYER_LANE_PADDING;
    const maxX = Math.max(minX, width - platform.width - PLAYER_LANE_PADDING);

    if (x <= minX) {
      x = minX;
      velocityX = Math.abs(velocityX);
    } else if (x >= maxX) {
      x = maxX;
      velocityX = -Math.abs(velocityX);
    }

    return { ...platform, x, velocityX };
  });
}

export default function PeachHopper() {
  const {
    earnGamePeaches,
    subscriptionHydrated,
    isSubscribed,
    requestSubscriptionAccess,
  } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();
  const windowSize = useWindowDimensions();
  const [status, setStatus] = useState<GameStatus>('idle');
  const [size, setSize] = useState({ width: windowSize.width, height: windowSize.height });
  const [world, setWorld] = useState<HopperWorld>(() => createInitialWorld(390, 760));
  const [score, setScore] = useState(0);
  const [collectedPeaches, setCollectedPeaches] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [result, setResult] = useState<GameResult | null>(null);
  const [simulatedDepth, setSimulatedDepth] = useState(0.5);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const calibrationFillProgress = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const scoreFlash = useRef(new Animated.Value(0)).current;
  const rawDepthRef = useRef(0);
  const latestDepthRef = useRef(0);
  const standingDepthRef = useRef(0);
  const standingKneeAngleRef = useRef(168);
  const lowestSquatDepthRef = useRef(1);
  const standingSamplesRef = useRef<number[]>([]);
  const standingKneeSamplesRef = useRef<number[]>([]);
  const squatSamplesRef = useRef<number[]>([]);
  const squatProgressMaxRef = useRef(0);
  const returnStandingSamplesRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const collectedPeachesRef = useRef(0);
  const nextPlatformIdRef = useRef(8);
  const gameStartedAtRef = useRef(0);
  const endedRef = useRef(false);
  const autostartedRef = useRef(false);

  const gameActive = status !== 'idle' && status !== 'ended';
  const pose = usePoseSession({
    target: 999,
    active: gameActive && Boolean(permission?.granted),
    restartAfterNativeCount: false,
  });
  const bodyVisible = Platform.OS === 'web' || pose.visible;
  const rawDepth = bodyVisible
    ? clampHopper(Platform.OS === 'web' ? simulatedDepth : pose.metrics.depth, 0, 1)
    : rawDepthRef.current;
  rawDepthRef.current = rawDepth;
  const calibratedDepth = normalizeCalibratedPoseDepth(
    rawDepth,
    standingDepthRef.current,
    lowestSquatDepthRef.current,
  );
  latestDepthRef.current = calibratedDepth;
  const currentCalibrationProgress = calculateSquatCalibrationProgress({
    depth: rawDepth,
    standingDepth: standingDepthRef.current,
    kneeAngle: Platform.OS === 'web' ? 168 - simulatedDepth * 80 : pose.metrics.kneeAngle,
    standingKneeAngle: standingKneeAngleRef.current,
    complete: status === 'calibratingReturn',
  });

  if (status === 'calibratingSquat') {
    squatProgressMaxRef.current = Math.max(
      squatProgressMaxRef.current,
      Math.min(currentCalibrationProgress, 0.98),
    );
  }

  const squatCalibrationProgress = status === 'calibratingReturn'
    ? 1
    : squatProgressMaxRef.current;
  const showCalibration = status === 'calibratingStanding'
    || status === 'calibratingSquat'
    || status === 'calibratingReturn'
    || status === 'countdown';

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => Platform.OS === 'web',
    onMoveShouldSetPanResponder: () => Platform.OS === 'web',
    onPanResponderGrant: (event) => {
      if (size.height <= 0) return;
      setSimulatedDepth(clampHopper(event.nativeEvent.locationY / size.height, 0, 1));
    },
    onPanResponderMove: (event) => {
      if (size.height <= 0) return;
      setSimulatedDepth(clampHopper(event.nativeEvent.locationY / size.height, 0, 1));
    },
    onPanResponderRelease: () => setSimulatedDepth(0.5),
    onPanResponderTerminate: () => setSimulatedDepth(0.5),
  }), [size.height]);

  useEffect(() => {
    void AsyncStorage.getItem(PEACH_HOPPER_BEST_SCORE_KEY)
      .then((stored) => {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) setBestScore(parsed);
      })
      .catch(() => {});
  }, []);

  const startRound = useCallback(async () => {
    if (!subscriptionHydrated) return;
    if (!isSubscribed) {
      const active = await requestSubscriptionAccess();
      if (!active) {
        router.back();
        return;
      }
    }

    if (Platform.OS !== 'web' && !permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) {
        setPermissionBlocked(true);
        return;
      }
    }

    endedRef.current = false;
    standingDepthRef.current = 0;
    standingKneeAngleRef.current = 168;
    lowestSquatDepthRef.current = 1;
    standingSamplesRef.current = [];
    standingKneeSamplesRef.current = [];
    squatSamplesRef.current = [];
    squatProgressMaxRef.current = 0;
    returnStandingSamplesRef.current = [];
    calibrationFillProgress.setValue(0);
    scoreRef.current = 0;
    collectedPeachesRef.current = 0;
    nextPlatformIdRef.current = 8;
    gameStartedAtRef.current = 0;
    setScore(0);
    setCollectedPeaches(0);
    setCountdown(COUNTDOWN_START);
    setResult(null);
    setPermissionBlocked(false);
    setWorld(createInitialWorld(Math.max(size.width, 320), Math.max(size.height, 560)));
    setStatus('calibratingStanding');
  }, [calibrationFillProgress, isSubscribed, permission?.granted, requestPermission, requestSubscriptionAccess, size.height, size.width, subscriptionHydrated]);

  useEffect(() => {
    if (autostartedRef.current || size.width <= 0 || size.height <= 0 || !subscriptionHydrated) return;
    autostartedRef.current = true;
    void startRound();
  }, [size.height, size.width, startRound, subscriptionHydrated]);

  useEffect(() => {
    const target = status === 'calibratingReturn'
      ? 1
      : status === 'calibratingSquat'
        ? squatCalibrationProgress
        : 0;
    const animation = Animated.timing(calibrationFillProgress, {
      toValue: target,
      duration: status === 'calibratingReturn' ? 90 : 110,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [calibrationFillProgress, squatCalibrationProgress, status]);

  useEffect(() => {
    if (status !== 'calibratingStanding') return;
    if (!bodyVisible) {
      standingSamplesRef.current = [];
      standingKneeSamplesRef.current = [];
      return;
    }

    const stableStandingPose = Platform.OS === 'web' || pose.phase === 'standing';
    if (!stableStandingPose) return;

    standingSamplesRef.current.push(rawDepthRef.current);
    if (pose.metrics.kneeAngle > 0) standingKneeSamplesRef.current.push(pose.metrics.kneeAngle);
    if (standingSamplesRef.current.length < STANDING_CALIBRATION_SAMPLES) return;

    standingDepthRef.current = median(standingSamplesRef.current.slice(-STANDING_CALIBRATION_SAMPLES));
    if (standingKneeSamplesRef.current.length > 0) {
      standingKneeAngleRef.current = median(standingKneeSamplesRef.current);
    }
    squatSamplesRef.current = [];
    squatProgressMaxRef.current = 0;
    setStatus('calibratingSquat');
  }, [bodyVisible, pose.metrics.kneeAngle, pose.phase, status]);

  useEffect(() => {
    if (status !== 'calibratingSquat') return;
    if (!bodyVisible) {
      squatSamplesRef.current = [];
      return;
    }

    squatSamplesRef.current.push(rawDepthRef.current);
    if (!isSquatCalibrationComplete(currentCalibrationProgress)) return;

    const lowestDepth = Math.max(...squatSamplesRef.current);
    lowestSquatDepthRef.current = Math.min(
      1,
      Math.max(lowestDepth, standingDepthRef.current + MIN_CALIBRATION_RANGE),
    );
    squatProgressMaxRef.current = 1;
    returnStandingSamplesRef.current = [];
    setStatus('calibratingReturn');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [bodyVisible, currentCalibrationProgress, status]);

  useEffect(() => {
    if (status !== 'calibratingReturn') return;
    if (!bodyVisible) {
      returnStandingSamplesRef.current = [];
      return;
    }

    const returnedToTop = normalizeCalibratedPoseDepth(
      rawDepthRef.current,
      standingDepthRef.current,
      lowestSquatDepthRef.current,
    ) <= STARTING_POSE_THRESHOLD;
    const stableStandingPose = Platform.OS === 'web' || pose.phase === 'standing';
    if (!returnedToTop || !stableStandingPose) {
      returnStandingSamplesRef.current = [];
      return;
    }

    returnStandingSamplesRef.current.push(rawDepthRef.current);
    if (returnStandingSamplesRef.current.length < RETURN_STANDING_SAMPLES) return;
    setCountdown(COUNTDOWN_START);
    setStatus('countdown');
  }, [bodyVisible, pose.phase, status]);

  useEffect(() => {
    if (status !== 'countdown') return;
    if (!bodyVisible) {
      setCountdown(COUNTDOWN_START);
      return;
    }

    const timeout = setTimeout(() => {
      if (countdown <= 1) {
        gameStartedAtRef.current = Date.now();
        setStatus('playing');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        return;
      }
      setCountdown((current) => Math.max(1, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [bodyVisible, countdown, status]);

  const finishGame = useCallback((fell: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus('ended');

    const finalScore = scoreRef.current;
    const finalCollected = collectedPeachesRef.current;
    const reward = calculatePeachHopperReward({
      score: finalScore,
      collectedPeaches: finalCollected,
    });
    const durationSeconds = Math.max(0, Math.floor((Date.now() - gameStartedAtRef.current) / 1000));

    if (finalScore > bestScore) {
      setBestScore(finalScore);
      void AsyncStorage.setItem(PEACH_HOPPER_BEST_SCORE_KEY, String(finalScore)).catch(() => {});
    }

    if (reward.peaches > 0) {
      void earnGamePeaches({
        peaches: reward.peaches,
        gameId: PEACH_HOPPER_GAME_ID,
        score: finalScore,
        durationSeconds,
      }).then((earned) => {
        setResult({
          score: finalScore,
          collectedPeaches: finalCollected,
          earnedPeaches: reward.peaches,
          xp: earned.xpAwarded,
          message: `${reward.peaches} Peaches added to your wallet`,
        });
      }).catch(() => {
        setResult({
          score: finalScore,
          collectedPeaches: finalCollected,
          earnedPeaches: 0,
          xp: 0,
          message: 'Reward could not be added',
        });
      });
    } else {
      setResult({
        score: finalScore,
        collectedPeaches: finalCollected,
        earnedPeaches: 0,
        xp: 0,
        message: 'Climb one platform to earn rewards',
      });
    }

    void Haptics.notificationAsync(
      fell ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  }, [bestScore, earnGamePeaches]);

  useEffect(() => {
    if (status !== 'playing' || size.width <= 0 || size.height <= 0) return;
    const deltaSeconds = GAME_TICK_MS / 1000;
    const playerLeft = size.width / 2 - HOPPER_PLAYER_SIZE / 2;
    const playerRight = playerLeft + HOPPER_PLAYER_SIZE;

    const interval = setInterval(() => {
      if (!bodyVisible) return;

      setWorld((current) => {
        let platforms = movePlatforms(current.platforms, size.width, deltaSeconds);
        let playerY = current.playerY;
        let velocityY = current.velocityY;
        let groundedPlatformId = current.groundedPlatformId;
        let charge = current.charge;
        let nextScore = scoreRef.current;
        let nextCollected = collectedPeachesRef.current;

        if (groundedPlatformId !== null) {
          const ground = platforms.find((platform) => platform.id === groundedPlatformId);
          if (ground) playerY = ground.y - HOPPER_PLAYER_SIZE;
          charge = Math.max(charge, latestDepthRef.current);

          if (canReleaseHopperJump({ charge, depth: latestDepthRef.current })) {
            velocityY = calculateLaunchVelocity(charge);
            groundedPlatformId = null;
            charge = 0;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
        } else {
          const previousBottom = playerY + HOPPER_PLAYER_SIZE;
          velocityY += HOPPER_GRAVITY * deltaSeconds;
          playerY += velocityY * deltaSeconds;
          const nextBottom = playerY + HOPPER_PLAYER_SIZE;

          if (velocityY > 0) {
            const landing = platforms
              .filter((platform) => (
                previousBottom <= platform.y + 4
                && nextBottom >= platform.y
                && playerRight > platform.x + 7
                && playerLeft < platform.x + platform.width - 7
              ))
              .sort((a, b) => a.y - b.y)[0];

            if (landing) {
              playerY = landing.y - HOPPER_PLAYER_SIZE;
              velocityY = 0;
              groundedPlatformId = landing.id;
              charge = 0;
              if (!landing.visited) {
                platforms = platforms.map((platform) => (
                  platform.id === landing.id ? { ...platform, visited: true } : platform
                ));
                nextScore += 1;
                scoreRef.current = nextScore;
                setScore(nextScore);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
            }
          }
        }

        platforms = platforms.map((platform) => {
          if (!platform.hasCollectible || platform.collected) return platform;
          const collectibleX = platform.x + platform.width / 2;
          const collectibleY = platform.y - 27;
          const playerCenterY = playerY + HOPPER_PLAYER_SIZE / 2;
          if (
            Math.abs(size.width / 2 - collectibleX) <= HOPPER_PLAYER_SIZE * 0.54
            && Math.abs(playerCenterY - collectibleY) <= HOPPER_PLAYER_SIZE * 0.56
          ) {
            nextCollected += 1;
            collectedPeachesRef.current = nextCollected;
            setCollectedPeaches(nextCollected);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            return { ...platform, collected: true };
          }
          return platform;
        });

        const scrollLine = size.height * 0.42;
        if (playerY < scrollLine && velocityY < 0) {
          const shift = scrollLine - playerY;
          playerY = scrollLine;
          platforms = platforms.map((platform) => ({ ...platform, y: platform.y + shift }));
        }

        platforms = platforms.filter((platform) => platform.y < size.height + 90);
        let minY = platforms.reduce((minimum, platform) => Math.min(minimum, platform.y), size.height);
        while (minY > -160) {
          const id = nextPlatformIdRef.current;
          const spacing = PLATFORM_SPACING + ((id * 13) % 22) - 11;
          minY -= spacing;
          platforms.push(makePlatform(id, minY, size.width));
          nextPlatformIdRef.current += 1;
        }

        if (playerY > size.height + 44) {
          finishGame(true);
        }

        return {
          playerY,
          velocityY,
          groundedPlatformId,
          charge,
          platforms,
          frame: (current.frame + 1) % 100_000,
        };
      });
    }, GAME_TICK_MS);

    return () => clearInterval(interval);
  }, [bodyVisible, finishGame, size.height, size.width, status]);

  useEffect(() => {
    scoreScale.setValue(1.28);
    scoreFlash.setValue(0.9);
    Animated.parallel([
      Animated.spring(scoreScale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 230,
        damping: 13,
        mass: 0.58,
      }),
      Animated.timing(scoreFlash, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [score, scoreFlash, scoreScale]);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (
      current.width === width && current.height === height ? current : { width, height }
    ));
    if (status === 'idle' && (size.width !== width || size.height !== height)) {
      setWorld(createInitialWorld(width, height));
    }
  }

  function exitGame() {
    if (status === 'playing') {
      finishGame(false);
      return;
    }
    router.back();
  }

  const grounded = world.groundedPlatformId !== null;
  const chargePercent = Math.round(world.charge * 100);

  return (
    <Screen scroll={false} flush backgroundColor="#6FCBFF">
      <View
        onLayout={handleLayout}
        style={styles.game}
        {...panResponder.panHandlers}
      >
        <PeachHopperScene
          width={Math.max(size.width, 1)}
          height={Math.max(size.height, 1)}
          playerY={world.playerY}
          charge={world.charge}
          platforms={world.platforms}
          frame={world.frame}
        />

        {permission?.granted && Platform.OS === 'ios' && gameActive ? (
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
        {permission?.granted && Platform.OS !== 'ios' && Platform.OS !== 'web' && gameActive ? (
          <View pointerEvents="none" style={styles.posePreview}>
            <CameraView active facing="front" mirror style={styles.cameraFill} />
          </View>
        ) : null}

        {status === 'playing' ? (
          <>
            <View pointerEvents="none" style={styles.scoreArea}>
              <Animated.Text
                accessibilityLabel={`Score ${score}`}
                style={[styles.score, { transform: [{ scale: scoreScale }] }]}
              >
                {score}
              </Animated.Text>
              <Animated.Text
                style={[styles.score, styles.scoreFlash, { opacity: scoreFlash, transform: [{ scale: scoreScale }] }]}
              >
                {score}
              </Animated.Text>
            </View>
            <View pointerEvents="none" style={styles.collectibleCounter}>
              <Sparkles size={16} stroke={colors.cocoa} strokeWidth={2.8} />
              <Text style={styles.collectibleCounterText}>{collectedPeaches}</Text>
            </View>
            {!bodyVisible ? (
              <View pointerEvents="none" style={styles.bodyLostOverlay}>
                <Text style={styles.bodyLostText}>STEP BACK</Text>
              </View>
            ) : null}
            {grounded && bodyVisible ? (
              <View pointerEvents="none" style={styles.chargeHud}>
                <View style={styles.chargeTrack}>
                  <View style={[styles.chargeFill, { width: `${chargePercent}%` }]} />
                </View>
                <View style={styles.chargeCopy}>
                  <Text style={styles.chargeText}>
                    {world.charge >= 0.2 ? 'STAND TO LAUNCH' : 'SQUAT TO CHARGE'}
                  </Text>
                  <ArrowUp size={24} stroke={colors.white} strokeWidth={3} />
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit Peach Hopper"
          onPress={exitGame}
          style={styles.closeButton}
        >
          <X size={23} stroke={colors.white} strokeWidth={2.7} />
        </Pressable>

        {showCalibration ? (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <View style={styles.calibrationPrompt}>
              {bodyVisible && (status === 'calibratingSquat' || status === 'calibratingReturn') ? (
                <Animated.View
                  style={[
                    styles.calibrationFill,
                    {
                      height: calibrationFillProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              ) : null}
              <Text style={status === 'countdown' && bodyVisible ? styles.countdown : styles.calibrationText}>
                {!bodyVisible
                  ? 'STEP BACK'
                  : status === 'calibratingStanding'
                    ? 'STAND STRAIGHT'
                    : status === 'calibratingSquat'
                      ? 'SQUAT COMPLETELY DOWN'
                      : status === 'calibratingReturn'
                        ? 'STAND BACK UP'
                        : countdown}
              </Text>
            </View>
          </View>
        ) : null}

        {permissionBlocked ? (
          <View style={styles.centerOverlay}>
            <View style={styles.permissionPanel}>
              <Text style={styles.resultTitle}>Camera needed</Text>
              <Text style={styles.resultMessage}>Peach Hopper uses your squat to charge every jump.</Text>
              <Button label="Allow camera" onPress={() => void startRound()} forceGlass />
            </View>
          </View>
        ) : null}

        {status === 'ended' ? (
          <View style={styles.resultOverlay}>
            <View style={styles.resultPanel}>
              <View style={styles.resultIcon}>
                <Trophy size={31} stroke={colors.cocoa} strokeWidth={2.8} />
              </View>
              <Text style={styles.resultEyebrow}>PEACH HOPPER</Text>
              <Text style={styles.resultTitle}>{score} platforms</Text>
              <Text style={styles.resultStats}>
                {collectedPeaches} bonus Peaches  ·  Best {Math.max(bestScore, score)}
              </Text>
              <Text style={styles.resultMessage}>{result?.message ?? 'Adding your rewards…'}</Text>
              {result?.xp ? <Text style={styles.resultXp}>+{result.xp} XP</Text> : null}
              <View style={styles.resultActions}>
                <Button label="Play again" icon={RotateCcw} onPress={() => void startRound()} forceGlass />
                <Button label="Games" icon={Gamepad2} onPress={() => router.back()} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyLostOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bodyLostText: {
    color: colors.white,
    fontSize: 44,
    fontWeight: '900',
    textShadowColor: 'rgba(58,31,44,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  calibrationFill: {
    backgroundColor: colors.lime,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  calibrationPrompt: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,31,44,0.6)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 30,
    borderWidth: 1.5,
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 20,
    width: 282,
  },
  calibrationText: {
    color: colors.white,
    fontSize: 41,
    fontWeight: '900',
    letterSpacing: -1.1,
    lineHeight: 45,
    textAlign: 'center',
    textShadowColor: 'rgba(58,31,44,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    zIndex: 2,
  },
  cameraFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  centerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 26,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  chargeCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
  },
  chargeFill: {
    backgroundColor: colors.lime,
    borderRadius: 5,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  chargeHud: {
    alignItems: 'center',
    bottom: 32,
    left: 28,
    position: 'absolute',
    right: 28,
  },
  chargeText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(58,31,44,0.62)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  chargeTrack: {
    backgroundColor: 'rgba(58,31,44,0.3)',
    borderColor: 'rgba(255,255,255,0.68)',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    overflow: 'hidden',
    width: 210,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,31,44,0.5)',
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 48,
    width: 46,
    zIndex: 10,
  },
  collectibleCounter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    left: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    position: 'absolute',
    top: 52,
  },
  collectibleCounterText: {
    color: colors.cocoa,
    fontSize: 15,
    fontWeight: '900',
  },
  countdown: {
    color: colors.white,
    fontSize: 116,
    fontWeight: '900',
    lineHeight: 122,
    textShadowColor: 'rgba(58,31,44,0.62)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 9,
    zIndex: 2,
  },
  game: {
    flex: 1,
    overflow: 'hidden',
  },
  permissionPanel: {
    backgroundColor: 'rgba(58,31,44,0.82)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 28,
    borderWidth: 1.5,
    gap: 18,
    padding: 24,
    width: '100%',
  },
  posePreview: {
    backgroundColor: '#6FCBFF',
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 22,
    borderWidth: 2,
    bottom: 112,
    height: 248,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    width: 166,
  },
  resultActions: {
    gap: 10,
    marginTop: 8,
  },
  resultEyebrow: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  resultIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.lime,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  resultMessage: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  resultOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(34,16,28,0.48)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 24,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  resultPanel: {
    backgroundColor: 'rgba(58,31,44,0.9)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 31,
    borderWidth: 1.5,
    gap: 12,
    padding: 24,
    width: '100%',
  },
  resultStats: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 39,
    textAlign: 'center',
  },
  resultXp: {
    color: colors.lime,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  score: {
    color: colors.white,
    fontSize: 104,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 112,
    textAlign: 'center',
    textShadowColor: 'rgba(58,31,44,0.58)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  scoreArea: {
    left: 72,
    position: 'absolute',
    right: 72,
    top: 27,
  },
  scoreFlash: {
    color: colors.lime,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
