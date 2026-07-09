import { Platform } from 'react-native';

import BootyblockTikTok from '../../modules/bootyblock-tiktok/src/BootyblockTikTokModule';

type TikTokProperties = Record<string, string | number | boolean | null | undefined>;

const TIKTOK_ENABLED = Platform.OS === 'ios' && Boolean(BootyblockTikTok.isAvailable);

function cleanProperties(properties?: TikTokProperties) {
  if (!properties) return undefined;

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== null && value !== undefined),
  ) as TikTokProperties;
}

function track(eventName: string, properties?: TikTokProperties) {
  if (!TIKTOK_ENABLED) return;

  void BootyblockTikTok.trackEventAsync(eventName, cleanProperties(properties));
}

export const tiktokService = {
  requestTrackingAuthorization() {
    if (!TIKTOK_ENABLED) return;

    void BootyblockTikTok.requestTrackingAuthorizationAsync();
  },

  trackOnboardingComplete(properties?: TikTokProperties) {
    track('CompleteTutorial', properties);
  },

  trackBlockedAppsSelected(properties?: TikTokProperties) {
    track('Registration', properties);
  },

  trackPaywallViewed(properties?: TikTokProperties) {
    track('ViewContent', {
      content_type: 'subscription',
      content_id: 'bootyblock_pro',
      content_name: 'Bootyblock Pro',
      ...properties,
    });
  },

  trackSubscribe(properties?: TikTokProperties) {
    track('Subscribe', properties);
  },

  trackPurchase(properties?: TikTokProperties) {
    if (!TIKTOK_ENABLED) return;

    void BootyblockTikTok.trackPurchaseAsync(cleanProperties({
      content_type: 'subscription',
      content_id: 'bootyblock_pro',
      content_name: 'Bootyblock Pro',
      description: 'Bootyblock Pro subscription',
      ...properties,
    }));
  },
};
