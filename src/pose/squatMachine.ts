export type SquatPhase = 'calibrating' | 'standing' | 'descending' | 'bottom' | 'rising' | 'complete';

export type PoseSample = {
  timestamp: number;
  confidence: number;
  visible: boolean;
  hipY: number;
  kneeY: number;
  shoulderY: number;
  kneeAngle?: number;
  hipAngle?: number;
  torsoLean?: number;
};

export type SquatState = {
  count: number;
  target: number;
  phase: SquatPhase;
  confidence: number;
  visible: boolean;
  hint: string;
};

type MachineInternals = SquatState & {
  baseline: number | null;
  calibrationSamples: number[];
  sawBottomAt: number | null;
  repStartedAt: number | null;
  lastCountAt: number;
  bottomFrames: number;
  standFrames: number;
};

const calibrationCount = 12;
const lowConfidence = 0.42;
const bottomDelta = 0.1;
const standDelta = 0.055;
const minRepMs = 350;
const minRiseMs = 120;
const bottomKneeAngle = 125;
const standingKneeAngle = 152;
const descendingKneeAngle = 150;
const standingHipAngle = 148;
const calibrationKneeAngle = 138;
const calibrationHipAngle = 136;
const calibrationTorsoLean = 48;
const maximumTorsoLean = 52;
const bottomStableFrames = 2;
const standingStableFrames = 2;

function hipDrop(sample: PoseSample, baseline: number | null) {
  if (baseline == null) return 0;
  return sample.hipY - baseline;
}

export function createSquatMachine(target: number): MachineInternals {
  return {
    count: 0,
    target,
    phase: 'calibrating',
    confidence: 0,
    visible: false,
    hint: 'Stand tall so bootyblock can learn your starting position.',
    baseline: null,
    calibrationSamples: [],
    sawBottomAt: null,
    repStartedAt: null,
    lastCountAt: 0,
    bottomFrames: 0,
    standFrames: 0,
  };
}

export function updateSquatMachine(state: MachineInternals, sample: PoseSample): MachineInternals {
  if (!sample.visible) {
    return {
      ...state,
      confidence: sample.confidence,
      visible: false,
      hint: 'Step back until your shoulders, hips, and knees are in frame.',
    };
  }

  if (sample.confidence < lowConfidence) {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      hint: 'Find brighter light so the squat can count cleanly.',
    };
  }

  if (state.phase === 'calibrating') {
    const standingEnough =
      [
        sample.kneeAngle == null || sample.kneeAngle >= calibrationKneeAngle,
        sample.hipAngle == null || sample.hipAngle >= calibrationHipAngle,
        sample.torsoLean == null || sample.torsoLean <= calibrationTorsoLean,
        sample.hipY > sample.kneeY,
      ].filter(Boolean).length >= 3;

    if (!standingEnough) {
      return {
        ...state,
        confidence: sample.confidence,
        visible: true,
        calibrationSamples: [],
        hint: 'Stand tall and hold still for calibration.',
      };
    }

    const calibrationSamples = [...state.calibrationSamples, sample.hipY].slice(-calibrationCount);
    const ready = calibrationSamples.length >= calibrationCount;
    const baseline = ready
      ? calibrationSamples.reduce((total, value) => total + value, 0) / calibrationSamples.length
      : null;

    return {
      ...state,
      baseline,
      calibrationSamples,
      confidence: sample.confidence,
      visible: true,
      phase: ready ? 'standing' : 'calibrating',
      hint: ready ? 'Go low, then stand tall to count one squat.' : 'Hold still for calibration.',
    };
  }

  const drop = hipDrop(sample, state.baseline);
  const kneeAngle = sample.kneeAngle ?? (drop > bottomDelta ? bottomKneeAngle : standingKneeAngle);
  const hipAngle = sample.hipAngle ?? (drop > bottomDelta ? 110 : standingHipAngle);
  const torsoLean = sample.torsoLean ?? 0;
  const depthSignals = [
    drop >= bottomDelta,
    kneeAngle <= bottomKneeAngle,
    hipAngle <= 145,
  ].filter(Boolean).length;
  const standingSignals = [
    drop <= standDelta,
    kneeAngle >= standingKneeAngle,
    hipAngle >= standingHipAngle,
  ].filter(Boolean).length;
  const hasGoodDepth = depthSignals >= 2 && drop >= bottomDelta * 0.8;
  const isStanding = standingSignals >= 2 && drop <= standDelta * 1.5;
  const isClearlyRising =
    !hasGoodDepth &&
    [
      drop <= bottomDelta * 0.72,
      kneeAngle >= 145,
      hipAngle >= 150,
    ].filter(Boolean).length >= 2;
  const torsoIsSafe = torsoLean <= maximumTorsoLean;

  if (
    hasGoodDepth &&
    torsoIsSafe &&
    (state.phase === 'standing' || state.phase === 'descending' || state.phase === 'bottom')
  ) {
    const bottomFrames = state.bottomFrames + 1;
    const repStartedAt = state.repStartedAt ?? sample.timestamp;

    if (bottomFrames >= bottomStableFrames) {
      const repElapsed = sample.timestamp - repStartedAt;
      const canCount =
        repElapsed >= minRepMs &&
        sample.timestamp - state.lastCountAt >= minRepMs;
      const nextCount = canCount ? Math.min(state.target, state.count + 1) : state.count;

      return {
        ...state,
        count: nextCount,
        confidence: sample.confidence,
        visible: true,
        phase: canCount ? (nextCount >= state.target ? 'complete' : 'rising') : 'bottom',
        sawBottomAt: canCount ? null : sample.timestamp,
        repStartedAt,
        lastCountAt: canCount ? sample.timestamp : state.lastCountAt,
        bottomFrames,
        standFrames: 0,
        hint: canCount
          ? nextCount >= state.target
            ? 'Banked. You earned those minutes.'
            : 'Counted. Drop again.'
          : 'Slow it down and use your full range.',
      };
    }

    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'descending',
      sawBottomAt: null,
      repStartedAt,
      bottomFrames,
      hint: 'Hold that depth.',
    };
  }

  if ((drop > standDelta || kneeAngle < descendingKneeAngle) && state.phase === 'standing') {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'descending',
      repStartedAt: state.repStartedAt ?? sample.timestamp,
      bottomFrames: 0,
      hint: 'Keep going.',
    };
  }

  if (state.phase === 'bottom' && isClearlyRising && !isStanding) {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'rising',
      standFrames: 0,
      hint: 'Stand tall.',
    };
  }

  if (state.phase === 'rising' && isStanding && state.sawBottomAt == null) {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'standing',
      sawBottomAt: null,
      repStartedAt: null,
      bottomFrames: 0,
      standFrames: 0,
      hint: 'Drop again.',
    };
  }

  if (isStanding && state.phase === 'descending') {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'standing',
      repStartedAt: null,
      bottomFrames: 0,
      hint: 'That was a little shallow. Try sitting lower.',
    };
  }

  // A fast rep or a dropped Vision frame can jump directly from bottom to
  // standing. Count that path too instead of requiring an intermediate
  // non-standing "rising" frame.
  if (
    (state.phase === 'rising' || state.phase === 'bottom') &&
    isStanding &&
    state.sawBottomAt != null
  ) {
    const standFrames = state.standFrames + 1;
    if (standFrames < standingStableFrames) {
      return {
        ...state,
        confidence: sample.confidence,
        visible: true,
        standFrames,
        hint: 'Finish tall.',
      };
    }

    const repElapsed = state.repStartedAt == null ? 0 : sample.timestamp - state.repStartedAt;
    const riseElapsed = sample.timestamp - state.sawBottomAt;
    const canCount =
      repElapsed >= minRepMs &&
      riseElapsed >= minRiseMs &&
      sample.timestamp - state.lastCountAt >= minRepMs;
    const nextCount = canCount ? Math.min(state.target, state.count + 1) : state.count;
    return {
      ...state,
      count: nextCount,
      confidence: sample.confidence,
      visible: true,
      phase: nextCount >= state.target ? 'complete' : 'standing',
      sawBottomAt: null,
      repStartedAt: null,
      lastCountAt: canCount ? sample.timestamp : state.lastCountAt,
      bottomFrames: 0,
      standFrames: 0,
      hint: canCount
        ? nextCount >= state.target
          ? 'Banked. You earned those minutes.'
          : 'Counted. Drop again.'
        : 'Slow it down and use your full range.',
    };
  }

  return {
    ...state,
    confidence: sample.confidence,
    visible: true,
    hint:
      state.phase === 'complete'
        ? 'Banked. You earned those minutes.'
        : torsoIsSafe
          ? 'Stay smooth and steady.'
          : 'Keep your chest up.',
  };
}

export function publicSquatState(state: MachineInternals): SquatState {
  const { count, target, phase, confidence, visible, hint } = state;
  return { count, target, phase, confidence, visible, hint };
}
