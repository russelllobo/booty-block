import { NativeModule, requireOptionalNativeModule } from 'expo';

type TikTokProperties = Record<string, string | number | boolean | null | undefined>;

declare class BootyblockTikTokModule extends NativeModule {
  isAvailable?: boolean;
  trackEventAsync(eventName: string, properties?: TikTokProperties): Promise<void>;
  trackPurchaseAsync(properties?: TikTokProperties): Promise<void>;
  requestTrackingAuthorizationAsync(): Promise<number>;
}

const fallbackModule = {
  isAvailable: false,
  async trackEventAsync() {},
  async trackPurchaseAsync() {},
  async requestTrackingAuthorizationAsync() {
    return 0;
  },
};

export default requireOptionalNativeModule<BootyblockTikTokModule>('BootyblockTikTok') ?? fallbackModule;
