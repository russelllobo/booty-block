import { PEACHES_PER_MINUTE } from '../../constants/bootyblock';

export const PEACH_HOPPER_GAME_ID = 'peach_hopper';
export const PEACH_HOPPER_BEST_SCORE_KEY = 'bootyblock:peach-hopper-best';

export const HOPPER_PLAYER_SIZE = 58;
export const HOPPER_PLATFORM_HEIGHT = 18;
export const HOPPER_GRAVITY = 1_350;

const MIN_CHARGE = 0.2;
const MIN_LAUNCH_SPEED = 610;
const CHARGE_LAUNCH_SPEED = 270;

export type PeachHopperReward = {
  peaches: number;
  qualified: boolean;
  reason: 'earned' | 'no_score';
};

export function clampHopper(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateLaunchVelocity(charge: number) {
  const normalizedCharge = clampHopper(charge, MIN_CHARGE, 1);
  return -(MIN_LAUNCH_SPEED + normalizedCharge * CHARGE_LAUNCH_SPEED);
}

export function canReleaseHopperJump({
  charge,
  depth,
}: {
  charge: number;
  depth: number;
}) {
  return charge >= MIN_CHARGE && depth <= 0.14;
}

export function calculatePeachHopperReward({
  score,
  collectedPeaches,
}: {
  score: number;
  collectedPeaches: number;
}): PeachHopperReward {
  const rewardUnits = Math.max(0, Math.floor(score))
    + Math.max(0, Math.floor(collectedPeaches));
  const peaches = rewardUnits * PEACHES_PER_MINUTE;

  return peaches > 0
    ? { peaches, qualified: true, reason: 'earned' }
    : { peaches: 0, qualified: false, reason: 'no_score' };
}
