import { EventSubscription } from 'expo-modules-core';
import { NativeModule, requireOptionalNativeModule } from 'expo';

import { BootyPoseModuleEvents } from './BootyPose.types';

declare class BootyPoseModule extends NativeModule<BootyPoseModuleEvents> {
  isAvailable?: boolean;
  startSessionAsync(targetSquats: number): Promise<void>;
  stopSessionAsync(): Promise<void>;
}

const fallbackModule = {
  isAvailable: false,
  async startSessionAsync() {},
  async stopSessionAsync() {},
  addListener() {
    return { remove() {} } as EventSubscription;
  },
};

export default requireOptionalNativeModule<BootyPoseModule>('BootyPose') ?? fallbackModule;
