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
const lowConfidence = 0.55;
const bottomDelta = 0.12;
const standDelta = 0.05;
const minRepMs = 700;
const bottomKneeAngle = 108;
const standingKneeAngle = 158;
const descendingKneeAngle = 148;
const standingHipAngle = 155;
const maximumTorsoLean = 48;
const stableFrames = 2;

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
    hint: 'Stand tall so Bootyblock can learn your starting position.',
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
      (sample.kneeAngle == null || sample.kneeAngle >= standingKneeAngle) &&
      (sample.hipAngle == null || sample.hipAngle >= standingHipAngle);

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
  const hasGoodDepth = drop > bottomDelta && kneeAngle <= bottomKneeAngle && hipAngle <= 135;
  const isStanding = drop <= standDelta && kneeAngle >= standingKneeAngle && hipAngle >= standingHipAngle;
  const torsoIsSafe = torsoLean <= maximumTorsoLean;

  if (hasGoodDepth && torsoIsSafe && (state.phase === 'standing' || state.phase === 'descending')) {
    const bottomFrames = state.bottomFrames + 1;
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: bottomFrames >= stableFrames ? 'bottom' : 'descending',
      sawBottomAt: bottomFrames >= stableFrames ? (state.sawBottomAt ?? sample.timestamp) : null,
      repStartedAt: state.repStartedAt ?? sample.timestamp,
      bottomFrames,
      hint: bottomFrames >= stableFrames ? 'Nice depth. Stand tall to lock it in.' : 'Hold that depth.',
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

  if (state.phase === 'bottom' && !isStanding) {
    return {
      ...state,
      confidence: sample.confidence,
      visible: true,
      phase: 'rising',
      standFrames: 0,
      hint: 'Stand tall.',
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

  if (state.phase === 'rising' && isStanding && state.sawBottomAt != null) {
    const standFrames = state.standFrames + 1;
    if (standFrames < stableFrames) {
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
      riseElapsed >= 250 &&
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
          ? 'Unlocked. You earned those minutes.'
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
        ? 'Unlocked. You earned those minutes.'
        : torsoIsSafe
          ? 'Stay smooth and steady.'
          : 'Keep your chest up.',
  };
}

export function publicSquatState(state: MachineInternals): SquatState {
  const { count, target, phase, confidence, visible, hint } = state;
  return { count, target, phase, confidence, visible, hint };
}
