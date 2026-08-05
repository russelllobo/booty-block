import {
  calculateLaunchVelocity,
  calculatePeachHopperReward,
  canReleaseHopperJump,
} from '../lib/games/peachHopper';

describe('peach hopper game logic', () => {
  it('turns a deeper squat into a stronger upward launch', () => {
    expect(calculateLaunchVelocity(0.3)).toBeGreaterThan(calculateLaunchVelocity(0.9));
  });

  it('requires a charged squat followed by a return to standing', () => {
    expect(canReleaseHopperJump({ charge: 0.1, depth: 0 })).toBe(false);
    expect(canReleaseHopperJump({ charge: 0.8, depth: 0.5 })).toBe(false);
    expect(canReleaseHopperJump({ charge: 0.8, depth: 0.1 })).toBe(true);
  });

  it('rewards climbed platforms and collected bonus peaches', () => {
    expect(calculatePeachHopperReward({ score: 4, collectedPeaches: 2 })).toEqual({
      peaches: 6,
      qualified: true,
      reason: 'earned',
    });
  });

  it('does not reward an empty run', () => {
    expect(calculatePeachHopperReward({ score: 0, collectedPeaches: 0 })).toEqual({
      peaches: 0,
      qualified: false,
      reason: 'no_score',
    });
  });
});
