import { PEACHES_PER_MINUTE } from '../../constants/bootyblock';

export const FLAPPY_SQUAT_GAME_ID = 'flappy_squat';
const CONTROLLER_SQUAT_RANGE = 0.4;
const CONTROLLER_STANDING_DEAD_ZONE = 0.025;
const CONTROLLER_RESPONSE_CURVE = 1.12;
const BIRD_TOP_PADDING = 18;
const FULL_SQUAT_DEPTH = 0.72;
const FULL_SQUAT_KNEE_ANGLE = 105;
const SQUAT_CALIBRATION_COMPLETION = 0.96;

export type FlappySquatRewardInput = {
  score: number;
};

export type FlappySquatReward = {
  peaches: number;
  qualified: boolean;
  reason: 'earned' | 'no_score';
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function mapDepthToBirdY(depth: number, trackHeight: number, birdSize: number) {
  const topPadding = Math.min(BIRD_TOP_PADDING, Math.max(0, trackHeight - birdSize));
  const travel = Math.max(0, trackHeight - birdSize - topPadding);
  const normalizedDepth = clamp(depth, 0, 1);
  return clamp(topPadding + normalizedDepth * travel, topPadding, topPadding + travel);
}

export function normalizePoseDepth(depth: number, standingDepth: number) {
  const movement = depth - standingDepth - CONTROLLER_STANDING_DEAD_ZONE;
  const usableRange = CONTROLLER_SQUAT_RANGE - CONTROLLER_STANDING_DEAD_ZONE;
  const linearDepth = clamp(movement / usableRange, 0, 1);
  return Math.pow(linearDepth, CONTROLLER_RESPONSE_CURVE);
}

export function normalizeCalibratedPoseDepth(
  depth: number,
  standingDepth: number,
  lowestSquatDepth: number,
) {
  const calibratedRange = lowestSquatDepth - standingDepth;
  if (!Number.isFinite(calibratedRange) || calibratedRange <= 0) return 0;
  return clamp((depth - standingDepth) / calibratedRange, 0, 1);
}

export function calculateSquatCalibrationProgress({
  depth,
  standingDepth,
  kneeAngle,
  standingKneeAngle,
  complete = false,
}: {
  depth: number;
  standingDepth: number;
  kneeAngle: number;
  standingKneeAngle: number;
  complete?: boolean;
}) {
  if (complete) return 1;

  const depthRange = Math.max(0.01, FULL_SQUAT_DEPTH - standingDepth);
  const depthProgress = clamp((depth - standingDepth) / depthRange, 0, 1);
  const kneeRange = standingKneeAngle - FULL_SQUAT_KNEE_ANGLE;
  const hasReliableKneeAngle = kneeAngle > 0 && kneeRange > 0;
  const kneeProgress = hasReliableKneeAngle
    ? clamp((standingKneeAngle - kneeAngle) / kneeRange, 0, 1)
    : 0;

  // Both the hip drop and knee bend must show a deep squat. Taking the more
  // advanced signal made a noisy knee angle fill the calibration at the top
  // of the movement and made the whole controller range far too sensitive.
  return hasReliableKneeAngle ? Math.min(depthProgress, kneeProgress) : depthProgress;
}

export function isSquatCalibrationComplete(progress: number) {
  return clamp(progress, 0, 1) >= SQUAT_CALIBRATION_COMPLETION;
}

export function smoothDepth(previous: number, next: number, factor = 0.2) {
  return previous + (clamp(next, 0, 1) - previous) * clamp(factor, 0, 1);
}

export function calculateFlappySquatReward({
  score,
}: FlappySquatRewardInput): FlappySquatReward {
  const peaches = Math.max(0, Math.floor(score)) * PEACHES_PER_MINUTE;

  return peaches > 0
    ? { peaches, qualified: true, reason: 'earned' }
    : { peaches: 0, qualified: false, reason: 'no_score' };
}
