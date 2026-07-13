import {
  calculateFlappySquatReward,
  mapDepthToBirdY,
  normalizePoseDepth,
  smoothDepth,
} from '../lib/games/flappySquat';

describe('flappy squat game logic', () => {
  it('maps squat depth to the bird track', () => {
    expect(mapDepthToBirdY(0, 300, 40)).toBe(18);
    expect(mapDepthToBirdY(0.5, 300, 40)).toBe(139);
    expect(mapDepthToBirdY(1, 300, 40)).toBe(260);
    expect(mapDepthToBirdY(2, 300, 40)).toBe(260);
  });

  it('uses the countdown standing pose as the top of the controller range', () => {
    expect(normalizePoseDepth(0.6, 0.6)).toBe(0);
    expect(normalizePoseDepth(0.62, 0.6)).toBe(0);
    expect(normalizePoseDepth(0.8, 0.6)).toBeCloseTo(0.4255, 3);
    expect(normalizePoseDepth(1, 0.6)).toBe(1);
  });

  it('smooths depth toward the next pose sample', () => {
    expect(smoothDepth(0.5, 1, 0.2)).toBeCloseTo(0.6);
    expect(smoothDepth(0.5, -1, 0.2)).toBeCloseTo(0.4);
  });

  it('does not reward a round with no score', () => {
    expect(calculateFlappySquatReward({ score: 0 })).toEqual({
      peaches: 0,
      qualified: false,
      reason: 'no_score',
    });
  });

  it('rewards ten Peaches for every point scored', () => {
    expect(calculateFlappySquatReward({ score: 6 })).toEqual({
      peaches: 60,
      qualified: true,
      reason: 'earned',
    });
    expect(calculateFlappySquatReward({ score: 20 })).toEqual({
      peaches: 200,
      qualified: true,
      reason: 'earned',
    });
  });
});
