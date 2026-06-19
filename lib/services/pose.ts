import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import BootyPoseModule from '../../modules/booty-pose/src/BootyPoseModule';
import type {
  PoseLandmarks,
  PoseMetrics,
} from '../../modules/booty-pose/src/BootyPose.types';
import { createSquatMachine, publicSquatState, SquatState, updateSquatMachine } from '../../src/pose/squatMachine';

type PoseSessionOptions = {
  target: number;
  active: boolean;
};

export type PoseSessionState = SquatState & {
  landmarks: PoseLandmarks;
  metrics: PoseMetrics;
  frameWidth: number;
  frameHeight: number;
};

const emptyMetrics: PoseMetrics = {
  kneeAngle: 0,
  hipAngle: 0,
  torsoLean: 0,
  depth: 0,
};

function initialPoseState(target: number): PoseSessionState {
  return {
    ...publicSquatState(createSquatMachine(target)),
    landmarks: {},
    metrics: emptyMetrics,
    frameWidth: 480,
    frameHeight: 640,
  };
}

export function usePoseSession({ target, active }: PoseSessionOptions) {
  const machineRef = useRef(createSquatMachine(target));
  const [state, setState] = useState<PoseSessionState>(() => initialPoseState(target));
  const nativeAvailable = Platform.OS === 'ios' && BootyPoseModule.isAvailable === true;

  useEffect(() => {
    machineRef.current = createSquatMachine(target);
    setState(initialPoseState(target));
  }, [target]);

  useEffect(() => {
    if (!active) return;

    if (nativeAvailable) {
      const updateSub = BootyPoseModule.addListener('poseUpdate', (event) => {
        setState({
          count: event.count,
          target: event.target,
          phase: event.phase,
          confidence: event.confidence,
          visible: event.visible,
          hint: event.hint,
          landmarks: event.landmarks,
          metrics: event.metrics,
          frameWidth: event.frameWidth,
          frameHeight: event.frameHeight,
        });
      });
      void BootyPoseModule.startSessionAsync(target);

      return () => {
        updateSub.remove();
        void BootyPoseModule.stopSessionAsync();
      };
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const rep = Math.floor(elapsed / 2200);
      const inRep = elapsed % 2200;
      const hipY = inRep < 650 ? 0.38 : inRep < 1250 ? 0.54 : 0.38;
      const isLow = hipY > 0.5;

      machineRef.current = updateSquatMachine(machineRef.current, {
        timestamp: elapsed,
        confidence: 0.94,
        visible: true,
        hipY,
        kneeY: 0.66,
        shoulderY: 0.2,
        kneeAngle: isLow ? 98 : 168,
        hipAngle: isLow ? 108 : 168,
        torsoLean: 10,
      });

      if (machineRef.current.count < Math.min(rep, target)) {
        machineRef.current = {
          ...machineRef.current,
          count: Math.min(rep, target),
          phase: rep >= target ? 'complete' : 'standing',
          hint: rep >= target ? 'Unlocked. You earned those minutes.' : 'Counted. Drop again.',
        };
      }

      setState({
        ...publicSquatState(machineRef.current),
        landmarks: {},
        metrics: {
          kneeAngle: isLow ? 98 : 168,
          hipAngle: isLow ? 108 : 168,
          torsoLean: 10,
          depth: isLow ? 0.82 : 0,
        },
        frameWidth: 480,
        frameHeight: 640,
      });
    }, 250);

    return () => clearInterval(interval);
  }, [active, nativeAvailable, target]);

  return state;
}
