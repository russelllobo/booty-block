export const FLAPPY_SQUAT_GAME_ID = 'flappy_squat';
export const FLAPPY_SQUAT_MIN_SECONDS = 30;
export const FLAPPY_SQUAT_SECONDS_PER_MINUTE = 30;

export type FlappySquatRewardInput = {
  durationSeconds: number;
  visibilityRatio: number;
};

export type FlappySquatReward = {
  minutes: number;
  qualified: boolean;
  reason: 'earned' | 'too_short' | 'poor_visibility';
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function mapDepthToBirdY(depth: number, trackHeight: number, birdSize: number) {
  const travel = Math.max(0, trackHeight - birdSize);
  const normalizedDepth = clamp(depth, 0, 1);
  return clamp(normalizedDepth * travel, 0, travel);
}

export function smoothDepth(previous: number, next: number, factor = 0.2) {
  return previous + (clamp(next, 0, 1) - previous) * clamp(factor, 0, 1);
}

export function calculateFlappySquatReward({
  durationSeconds,
  visibilityRatio,
}: FlappySquatRewardInput): FlappySquatReward {
  if (durationSeconds < FLAPPY_SQUAT_MIN_SECONDS) {
    return { minutes: 0, qualified: false, reason: 'too_short' };
  }

  if (visibilityRatio < 0.7) {
    return { minutes: 0, qualified: false, reason: 'poor_visibility' };
  }

  const minutes = Math.floor(durationSeconds / FLAPPY_SQUAT_SECONDS_PER_MINUTE);

  return minutes > 0
    ? { minutes, qualified: true, reason: 'earned' }
    : { minutes: 0, qualified: false, reason: 'too_short' };
}
