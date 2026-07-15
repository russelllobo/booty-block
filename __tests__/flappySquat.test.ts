import {
  calculateSquatCalibrationProgress,
  calculateFlappySquatReward,
  isSquatCalibrationComplete,
  mapDepthToBirdY,
  normalizeCalibratedPoseDepth,
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

  it('maps each player standing and deepest squat poses to the full bird track', () => {
    expect(normalizeCalibratedPoseDepth(0.18, 0.18, 0.72)).toBe(0);
    expect(normalizeCalibratedPoseDepth(0.45, 0.18, 0.72)).toBeCloseTo(0.5);
    expect(normalizeCalibratedPoseDepth(0.72, 0.18, 0.72)).toBe(1);
    expect(normalizeCalibratedPoseDepth(0.9, 0.18, 0.72)).toBe(1);
  });

  it('keeps the bird at the top when calibration has no usable range', () => {
    expect(normalizeCalibratedPoseDepth(0.4, 0.4, 0.4)).toBe(0);
  });

  it('fills squat calibration from the player standing pose to full depth', () => {
    expect(calculateSquatCalibrationProgress({
      depth: 0,
      standingDepth: 0,
      kneeAngle: 168,
      standingKneeAngle: 168,
    })).toBe(0);
    expect(calculateSquatCalibrationProgress({
      depth: 0.5,
      standingDepth: 0,
      kneeAngle: 132,
      standingKneeAngle: 168,
    })).toBeCloseTo(0.5);
    expect(calculateSquatCalibrationProgress({
      depth: 0.7,
      standingDepth: 0,
      kneeAngle: 110,
      standingKneeAngle: 168,
      complete: true,
    })).toBe(1);
  });

  it('advances as soon as the progress bar is visually complete', () => {
    expect(isSquatCalibrationComplete(0.93, false)).toBe(false);
    expect(isSquatCalibrationComplete(0.94, false)).toBe(true);
    expect(isSquatCalibrationComplete(0.2, true)).toBe(true);
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

  it('rewards one Peach for every point scored', () => {
    expect(calculateFlappySquatReward({ score: 6 })).toEqual({
      peaches: 6,
      qualified: true,
      reason: 'earned',
    });
    expect(calculateFlappySquatReward({ score: 20 })).toEqual({
      peaches: 20,
      qualified: true,
      reason: 'earned',
    });
  });
});
