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
  restartAfterNativeCount?: boolean;
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

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function initialPoseState(target: number): PoseSessionState {
  return {
    ...publicSquatState(createSquatMachine(target)),
    landmarks: {},
    metrics: emptyMetrics,
    frameWidth: 480,
    frameHeight: 640,
  };
}

export function usePoseSession({ target, active, restartAfterNativeCount = true }: PoseSessionOptions) {
  const machineRef = useRef(createSquatMachine(target));
  const completedNativeCountRef = useRef(0);
  const restartingNativeSessionRef = useRef(false);
  const [state, setState] = useState<PoseSessionState>(() => initialPoseState(target));
  const nativeAvailable = Platform.OS === 'ios' && BootyPoseModule.isAvailable === true;

  useEffect(() => {
    machineRef.current = createSquatMachine(target);
    completedNativeCountRef.current = 0;
    restartingNativeSessionRef.current = false;
    setState(initialPoseState(target));
  }, [target]);

  useEffect(() => {
    if (!active) return;

    if (nativeAvailable) {
      const updateSub = BootyPoseModule.addListener('poseUpdate', (event) => {
        const nativeCount = finiteNumber(event.count, 0);
        const totalCount = Math.min(target, completedNativeCountRef.current + nativeCount);

        setState((previous) => {
          const metrics = event.metrics ?? previous.metrics ?? emptyMetrics;

          return {
            count: totalCount,
            target,
            phase: event.phase ?? previous.phase,
            confidence: finiteNumber(event.confidence, previous.confidence),
            visible: event.visible ?? previous.visible,
            hint: event.hint ?? previous.hint,
            landmarks: event.landmarks ?? previous.landmarks ?? {},
            metrics: {
              kneeAngle: finiteNumber(metrics.kneeAngle, previous.metrics.kneeAngle),
              hipAngle: finiteNumber(metrics.hipAngle, previous.metrics.hipAngle),
              torsoLean: finiteNumber(metrics.torsoLean, previous.metrics.torsoLean),
              depth: finiteNumber(metrics.depth, previous.metrics.depth),
            },
            frameWidth: finiteNumber(event.frameWidth, previous.frameWidth),
            frameHeight: finiteNumber(event.frameHeight, previous.frameHeight),
          };
        });

        // Older installed binaries can remain in `rising` after a counted rep,
        // which prevents the next descent from being considered. Preserve the
        // total in JS and quietly start a fresh native tracking cycle for the
        // remaining reps. This is intentionally JS-side so EAS Update can fix
        // existing installs without waiting for a new native build.
        if (
          restartAfterNativeCount &&
          event.phase === 'rising' &&
          nativeCount > 0 &&
          totalCount < target &&
          !restartingNativeSessionRef.current
        ) {
          completedNativeCountRef.current = totalCount;
          restartingNativeSessionRef.current = true;
          void BootyPoseModule.startSessionAsync(target - totalCount)
            .catch((error) => console.error('Failed to continue pose session:', error))
            .finally(() => {
              restartingNativeSessionRef.current = false;
            });
        }
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
          hint: rep >= target ? 'Banked. You earned those minutes.' : 'Counted. Drop again.',
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
  }, [active, nativeAvailable, restartAfterNativeCount, target]);

  return state;
}
