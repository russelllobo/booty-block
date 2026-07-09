import { NativeModule, registerWebModule } from 'expo';

class BootyblockTikTokModule extends NativeModule {
  async trackEventAsync() {}
  async trackPurchaseAsync() {}
  async requestTrackingAuthorizationAsync() {
    return 0;
  }
}

export default registerWebModule(BootyblockTikTokModule, 'BootyblockTikTok');
