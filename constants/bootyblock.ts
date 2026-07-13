export const SELECTION_ID = 'bootyblock_blocked_apps';
export const SHIELD_ID = 'bootyblock_shield';
export const ALWAYS_BLOCK_ACTIVITY = 'bootyblock_always_block';
export const UNLOCK_ACTIVITY = 'bootyblock_unlock_window';
export const BANKED_USAGE_ACTIVITY = 'bankedusage';
export const BANK_DEPLETED_EVENT = 'bankdepleted';
export const BANK_PROGRESS_EVENT_PREFIX = 'bankprogress';
export const USAGE_WINDOW_DEPLETED_EVENT = 'usagewindowdepleted';
export const USAGE_WINDOW_PROGRESS_EVENT_PREFIX = 'usagewindowprogress';
export const SHIELD_OPEN_REQUEST_KEY = 'bootyblock_shield_open_requested_at';

export const PEACHES_PER_MINUTE = 10;
export const PEACHES_PER_SQUAT = 10;

export const minuteOptions = [5, 10, 15, 20, 30] as const;

export const entitlementBundleIds = [
  'com.bootyblock.app',
  'com.bootyblock.app.ActivityMonitorExtension',
  'com.bootyblock.app.ShieldAction',
  'com.bootyblock.app.ShieldConfiguration',
];
