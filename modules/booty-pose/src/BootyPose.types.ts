export type PosePhase = 'calibrating' | 'standing' | 'descending' | 'bottom' | 'rising' | 'complete';

export type PoseLandmarkName =
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

export type PoseLandmark = {
  x: number;
  y: number;
  confidence: number;
};

export type PoseLandmarks = Partial<Record<PoseLandmarkName, PoseLandmark>>;

export type PoseMetrics = {
  kneeAngle: number;
  hipAngle: number;
  torsoLean: number;
  depth: number;
};

export type PoseUpdateEvent = {
  count?: number;
  target?: number;
  phase?: PosePhase;
  confidence?: number;
  visible?: boolean;
  hint?: string;
  landmarks?: PoseLandmarks;
  metrics?: Partial<PoseMetrics>;
  frameWidth?: number;
  frameHeight?: number;
};

export type SessionCompleteEvent = {
  squats: number;
  grantedMinutes: number;
};

export type BootyPoseModuleEvents = {
  poseUpdate: (params: PoseUpdateEvent) => void;
  sessionComplete: (params: SessionCompleteEvent) => void;
};
