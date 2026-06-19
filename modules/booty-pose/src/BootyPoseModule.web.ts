import { registerWebModule, NativeModule } from 'expo';

import { BootyPoseModuleEvents } from './BootyPose.types';

class BootyPoseModule extends NativeModule<BootyPoseModuleEvents> {
  async startSessionAsync() {}
  async stopSessionAsync() {}
}

export default registerWebModule(BootyPoseModule, 'BootyPoseModule');
