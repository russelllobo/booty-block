import {
  calculateFlappySquatReward,
  mapDepthToBirdY,
  normalizePoseDepth,
  smoothDepth,
} from '../lib/games/flappySquat';

describe('flappy squat game logic', () => {
  it('maps squat depth to the bird track', () => {
    expect(mapDepthToBirdY(0, 300, 40)).toBe(0);
    expect(mapDepthToBirdY(0.5, 300, 40)).toBe(130);
    expect(mapDepthToBirdY(1, 300, 40)).toBe(260);
    expect(mapDepthToBirdY(2, 300, 40)).toBe(260);
  });

  it('uses the countdown standing pose as the top of the controller range', () => {
    expect(normalizePoseDepth(0.6, 0.6)).toBe(0);
    expect(normalizePoseDepth(0.62, 0.6)).toBe(0);
    expect(normalizePoseDepth(0.8, 0.6)).toBeCloseTo(0.4667, 3);
    expect(normalizePoseDepth(1, 0.6)).toBe(1);
  });

  it('smooths depth toward the next pose sample', () => {
    expect(smoothDepth(0.5, 1, 0.2)).toBeCloseTo(0.6);
    expect(smoothDepth(0.5, -1, 0.2)).toBeCloseTo(0.4);
  });

  it('requires enough visible movement time before rewarding minutes', () => {
    expect(calculateFlappySquatReward({ durationSeconds: 29, visibilityRatio: 1 })).toEqual({
      minutes: 0,
      qualified: false,
      reason: 'too_short',
    });
    expect(calculateFlappySquatReward({ durationSeconds: 60, visibilityRatio: 0.4 })).toEqual({
      minutes: 0,
      qualified: false,
      reason: 'poor_visibility',
    });
  });

  it('rewards the full play time without session or daily caps', () => {
    expect(calculateFlappySquatReward({ durationSeconds: 180, visibilityRatio: 1 })).toEqual({
      minutes: 6,
      qualified: true,
      reason: 'earned',
    });
    expect(calculateFlappySquatReward({ durationSeconds: 600, visibilityRatio: 1 })).toEqual({
      minutes: 20,
      qualified: true,
      reason: 'earned',
    });
  });
});
