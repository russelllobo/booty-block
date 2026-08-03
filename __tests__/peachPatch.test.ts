import { getPeachPatchStage } from '../lib/peachPatch';

describe('getPeachPatchStage', () => {
  it('starts with a populated patch so the world feels alive on day zero', () => {
    const stage = getPeachPatchStage(0);

    expect(stage.title).toBe('first sprouts');
    expect(stage.farmers).toBeGreaterThanOrEqual(2);
    expect(stage.peachTrees).toBeGreaterThanOrEqual(2);
    expect(stage.nextUnlockDay).toBe(7);
  });

  it('unlocks the farm in journey-day stages', () => {
    expect(getPeachPatchStage(6).hasBarn).toBe(false);
    expect(getPeachPatchStage(7).hasBarn).toBe(true);
    expect(getPeachPatchStage(21).hasPond).toBe(true);
    expect(getPeachPatchStage(45).hasWindmill).toBe(true);
  });

  it('clamps invalid progress to the 90-day journey', () => {
    expect(getPeachPatchStage(-12).index).toBe(0);
    expect(getPeachPatchStage(999).title).toBe('peach paradise');
    expect(getPeachPatchStage(999).nextUnlock).toBeNull();
  });
});
