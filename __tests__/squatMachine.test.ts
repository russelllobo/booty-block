import { createSquatMachine, updateSquatMachine } from '../src/pose/squatMachine';

function sample(
  timestamp: number,
  hipY: number,
  confidence = 0.95,
  visible = true,
  kneeAngle = hipY >= 0.52 ? 96 : hipY >= 0.46 ? 138 : 170,
  hipAngle = hipY >= 0.52 ? 105 : hipY >= 0.46 ? 142 : 170,
) {
  return {
    timestamp,
    hipY,
    confidence,
    visible,
    kneeY: 0.66,
    shoulderY: 0.2,
    kneeAngle,
    hipAngle,
    torsoLean: 12,
  };
}

function calibrate(target = 2) {
  let state = createSquatMachine(target);
  for (let index = 0; index < 12; index += 1) {
    state = updateSquatMachine(state, sample(index * 100, 0.4));
  }
  return state;
}

describe('squat state machine', () => {
  it('counts a full standing-bottom-standing rep', () => {
    let state = calibrate(2);

    state = updateSquatMachine(state, sample(1000, 0.48));
    state = updateSquatMachine(state, sample(1300, 0.56));
    state = updateSquatMachine(state, sample(1400, 0.56));
    state = updateSquatMachine(state, sample(1800, 0.47));
    state = updateSquatMachine(state, sample(2100, 0.4));
    state = updateSquatMachine(state, sample(2200, 0.4));

    expect(state.count).toBe(1);
    expect(state.phase).toBe('standing');
  });

  it('does not count shallow reps', () => {
    let state = calibrate(2);

    state = updateSquatMachine(state, sample(1000, 0.47));
    state = updateSquatMachine(state, sample(1500, 0.4));

    expect(state.count).toBe(0);
    expect(state.hint).toContain('shallow');
  });

  it('ignores low confidence frames', () => {
    let state = calibrate(2);

    state = updateSquatMachine(state, sample(1000, 0.57, 0.2));

    expect(state.count).toBe(0);
    expect(state.hint).toContain('brighter');
  });

  it('reports body visibility problems without changing count', () => {
    let state = calibrate(2);

    state = updateSquatMachine(state, sample(1000, 0.57, 0.95, false));

    expect(state.count).toBe(0);
    expect(state.visible).toBe(false);
  });

  it('marks complete when the target is reached', () => {
    let state = calibrate(1);

    state = updateSquatMachine(state, sample(1000, 0.56));
    state = updateSquatMachine(state, sample(1100, 0.56));
    state = updateSquatMachine(state, sample(1500, 0.47));
    state = updateSquatMachine(state, sample(1800, 0.4));
    state = updateSquatMachine(state, sample(1900, 0.4));

    expect(state.count).toBe(1);
    expect(state.phase).toBe('complete');
  });

  it('rejects a deep-looking hip drop when the knees stay straight', () => {
    let state = calibrate(2);

    state = updateSquatMachine(state, sample(1000, 0.56, 0.95, true, 168, 165));
    state = updateSquatMachine(state, sample(1800, 0.4));

    expect(state.count).toBe(0);
  });
});
