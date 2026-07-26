import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import {
  ALWAYS_BLOCK_ACTIVITY,
  BANK_DEPLETED_EVENT,
  BANK_PROGRESS_EVENT_PREFIX,
  BANKED_USAGE_ACTIVITY,
  SELECTION_ID,
  SHIELD_OPEN_REQUEST_KEY,
  SHIELD_ID,
  UNLOCK_ACTIVITY,
  USAGE_WINDOW_DEPLETED_EVENT,
  USAGE_WINDOW_PROGRESS_EVENT_PREFIX,
} from '../../constants/bootyblock';

export type ScreenTimeStatus = 'unavailable' | 'notDetermined' | 'denied' | 'approved';
export type ScreenTimeSelectionSummary = {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
  applications?: ScreenTimeApplicationMetadata[];
};

export type ScreenTimeApplicationMetadata = {
  id: string;
  displayName?: string;
  iconDataUri?: string;
};

type ShieldActionWithUrl = Omit<DeviceActivity.ShieldAction, 'type'> & {
  type: 'openUrl';
  url: string;
};

type ShieldActionsWithUrl = Omit<DeviceActivity.ShieldActions, 'primary'> & {
  primary: ShieldActionWithUrl;
};

type ShieldConfigurationWithVariants = DeviceActivity.ShieldConfiguration & {
  titleVariants: string[];
};

const approved = 2;
const denied = 1;
const notDetermined = 0;
const PROGRESS_INTERVAL_SECONDS = 60;
const SHIELD_OPEN_REQUEST_TTL_MS = 120_000;
const SHIELD_LOGO_FILE_NAME = 'bootyblock-shield-logo.png';
const SHIELD_TITLE_VARIANTS = [
  '{applicationOrDomainDisplayName} can wait. Glutes first.',
  '{applicationOrDomainDisplayName} is expensive today: 12 squats.',
  'Your thumb has done enough. Legs now.',
  'Doomscrolling tax: paid in squats.',
];
const shieldLogo = require('../../assets/logo.png');
const shieldPalette = {
  blush: { red: 255, green: 241, blue: 246 },
  raspberry: { red: 233, green: 30, blue: 115 },
  cocoa: { red: 58, green: 31, blue: 44 },
  mink: { red: 125, green: 90, blue: 103 },
  white: { red: 255, green: 255, blue: 255 },
};
let shieldLogoReady = false;
let shieldLogoCopyPromise: Promise<boolean> | null = null;

function toStatus(status: number | undefined): ScreenTimeStatus {
  if (status === approved) return 'approved';
  if (status === denied) return 'denied';
  if (status === notDetermined) return 'notDetermined';
  return 'unavailable';
}

function isAvailable() {
  return Platform.OS === 'ios' && DeviceActivity.isAvailable?.();
}

function durationComponentsFromSeconds(totalSeconds: number) {
  const seconds = Math.max(1, Math.round(totalSeconds));
  return {
    hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60),
    second: seconds % 60,
  };
}

function progressEventName(prefix: string, seconds: number) {
  return `${prefix}${seconds}`;
}

function progressSecondsFromEventName(eventName: string | undefined, prefix: string) {
  if (!eventName?.startsWith(prefix)) return null;
  const seconds = Number(eventName.slice(prefix.length));
  return Number.isFinite(seconds) ? seconds : null;
}

function buildUsageEvents(
  serializedSelection: string,
  totalSeconds: number,
  depletedEventName: string,
  progressEventPrefix: string,
): DeviceActivity.DeviceActivityEvent[] {
  const roundedSeconds = Math.max(1, Math.round(totalSeconds));
  const progressEvents: DeviceActivity.DeviceActivityEvent[] = [];

  for (
    let seconds = PROGRESS_INTERVAL_SECONDS;
    seconds < roundedSeconds;
    seconds += PROGRESS_INTERVAL_SECONDS
  ) {
    progressEvents.push({
      familyActivitySelection: serializedSelection,
      threshold: durationComponentsFromSeconds(seconds),
      eventName: progressEventName(progressEventPrefix, seconds),
      includesPastActivity: false,
    });
  }

  return [
    ...progressEvents,
    {
      familyActivitySelection: serializedSelection,
      threshold: durationComponentsFromSeconds(roundedSeconds),
      eventName: depletedEventName,
      includesPastActivity: false,
    },
  ];
}

function getNormalizedStoredSelection() {
  const serializedSelection = DeviceActivity.getFamilyActivitySelectionId(SELECTION_ID);
  if (!serializedSelection) return null;

  const normalizedSelection = DeviceActivity.convertToIncludeCategories?.({
    activitySelectionToken: serializedSelection,
  })?.familyActivitySelection;

  if (normalizedSelection && normalizedSelection !== serializedSelection) {
    DeviceActivity.setFamilyActivitySelectionId({
      id: SELECTION_ID,
      familyActivitySelection: normalizedSelection,
    });
    return normalizedSelection;
  }

  return serializedSelection;
}

function selectionCount(summary: ScreenTimeSelectionSummary | null) {
  if (!summary) return 0;
  return summary.applicationCount + summary.categoryCount + summary.webDomainCount;
}

function selectionPart(count: number, singular: string, plural = `${singular}s`) {
  return count > 0 ? `${count} ${count === 1 ? singular : plural}` : null;
}

function appGroupFileUri(fileName: string) {
  const directory = DeviceActivity.getAppGroupFileDirectory?.();
  if (!directory) return null;
  return `${directory.endsWith('/') ? directory : `${directory}/`}${fileName}`;
}

async function copyShieldLogoToAppGroup() {
  if (!isAvailable()) return false;
  if (shieldLogoReady) return true;

  shieldLogoCopyPromise ??= Asset.fromModule(shieldLogo)
    .downloadAsync()
    .then((asset) => {
      const sourceUri = asset.localUri ?? asset.uri;
      const destinationUri = appGroupFileUri(SHIELD_LOGO_FILE_NAME);
      if (!sourceUri || !destinationUri) return false;

      DeviceActivity.copyFile(sourceUri, destinationUri, true);
      shieldLogoReady = true;
      return true;
    })
    .catch((error) => {
      console.warn('Failed to prepare BootyBlock shield logo:', error);
      shieldLogoCopyPromise = null;
      return false;
    });

  return shieldLogoCopyPromise;
}

function buildShieldConfiguration(useLogo: boolean): DeviceActivity.ShieldConfiguration {
  const configuration: ShieldConfigurationWithVariants = {
    title: 'Blocked for your booty',
    titleVariants: SHIELD_TITLE_VARIANTS,
    subtitle: 'Open BootyBlock, knock out your squats, and earn this app back.',
    primaryButtonLabel: 'Open BootyBlock',
    iconSystemName: useLogo ? undefined : 'figure.strengthtraining.traditional',
    iconAppGroupRelativePath: useLogo ? SHIELD_LOGO_FILE_NAME : undefined,
    iconTint: useLogo ? undefined : shieldPalette.raspberry,
    backgroundColor: shieldPalette.blush,
    backgroundBlurStyle: 10,
    titleColor: shieldPalette.cocoa,
    subtitleColor: shieldPalette.mink,
    primaryButtonBackgroundColor: shieldPalette.raspberry,
    primaryButtonLabelColor: shieldPalette.white,
  };
  return configuration;
}

export const screenTimeService = {
  isAvailable,

  getSelectionSummary(): ScreenTimeSelectionSummary | null {
    if (!isAvailable()) return null;
    const metadata = DeviceActivity.activitySelectionMetadata({
      activitySelectionId: SELECTION_ID,
    });
    if (!metadata) return null;

    const summary = {
      applicationCount: metadata.applicationCount ?? 0,
      categoryCount: metadata.categoryCount ?? 0,
      webDomainCount: metadata.webDomainCount ?? 0,
      applications: metadata.applications ?? [],
    };
    return selectionCount(summary) > 0 ? summary : null;
  },

  formatSelectionSummary(summary: ScreenTimeSelectionSummary | null) {
    if (!summary) return 'No apps or categories selected';
    return [
      selectionPart(summary.applicationCount, 'app'),
      selectionPart(summary.categoryCount, 'category', 'categories'),
      selectionPart(summary.webDomainCount, 'website'),
    ]
      .filter(Boolean)
      .join(', ');
  },

  getAuthorizationStatus(): ScreenTimeStatus {
    if (!isAvailable()) return 'unavailable';
    return toStatus(DeviceActivity.getAuthorizationStatus?.());
  },

  async requestAuthorization(): Promise<ScreenTimeStatus> {
    if (!isAvailable()) return 'unavailable';
    await DeviceActivity.requestAuthorization('individual');
    const status = await DeviceActivity.pollAuthorizationStatus({ pollIntervalMs: 350, maxAttempts: 8 });
    return toStatus(status);
  },

  configureShield() {
    if (!isAvailable()) return;

    const shieldActions: ShieldActionsWithUrl = {
      primary: {
        behavior: 'close',
        type: 'openUrl',
        url: 'bootyblock://unlock',
      },
    };

    DeviceActivity.userDefaultsClearWithPrefix('shieldConfigurationForSelection');
    DeviceActivity.userDefaultsClearWithPrefix('shieldActionsForSelection');
    const shieldConfiguration = buildShieldConfiguration(shieldLogoReady);
    DeviceActivity.updateShield(shieldConfiguration, shieldActions as unknown as DeviceActivity.ShieldActions, 'bootyblock-configure-shield');
    DeviceActivity.updateShieldWithId(shieldConfiguration, shieldActions as unknown as DeviceActivity.ShieldActions, SHIELD_ID);
    void copyShieldLogoToAppGroup().then((logoReady) => {
      if (!logoReady) return;
      const logoShieldConfiguration = buildShieldConfiguration(true);
      DeviceActivity.updateShield(
        logoShieldConfiguration,
        shieldActions as unknown as DeviceActivity.ShieldActions,
        'bootyblock-configure-shield-logo',
      );
      DeviceActivity.updateShieldWithId(
        logoShieldConfiguration,
        shieldActions as unknown as DeviceActivity.ShieldActions,
        SHIELD_ID,
      );
    });
  },

  consumeShieldOpenRequest() {
    if (!isAvailable()) return false;

    const requestedAt = DeviceActivity.userDefaultsGet<number>(SHIELD_OPEN_REQUEST_KEY);
    DeviceActivity.userDefaultsRemove(SHIELD_OPEN_REQUEST_KEY);
    return typeof requestedAt === 'number' && Date.now() - requestedAt < SHIELD_OPEN_REQUEST_TTL_MS;
  },

  applyDefaultBlock() {
    if (!isAvailable()) return;
    DeviceActivity.stopMonitoring([BANKED_USAGE_ACTIVITY, UNLOCK_ACTIVITY]);
    DeviceActivity.cleanUpAfterActivity(BANKED_USAGE_ACTIVITY);
    DeviceActivity.cleanUpAfterActivity(UNLOCK_ACTIVITY);
    this.configureShield();
    DeviceActivity.clearWhitelistAndUpdateBlock('bootyblock-default-block');
    DeviceActivity.resetBlocks('bootyblock-default-block');
    DeviceActivity.blockSelection({ activitySelectionId: SELECTION_ID }, 'bootyblock-default-block');
  },

  releaseAllBlocks() {
    if (!isAvailable()) return;
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.cleanUpAfterActivity(ALWAYS_BLOCK_ACTIVITY);
    DeviceActivity.cleanUpAfterActivity(UNLOCK_ACTIVITY);
    DeviceActivity.cleanUpAfterActivity(BANKED_USAGE_ACTIVITY);
    DeviceActivity.clearWhitelist();
    DeviceActivity.resetBlocks('bootyblock-pro-access-inactive');
    DeviceActivity.refreshManagedSettingsStore();
  },

  saveNativeSelectionConfigured() {
    if (!isAvailable()) return;
    getNormalizedStoredSelection();
    this.configureShield();
    this.applyDefaultBlock();
  },

  hasUsageBankDepleted(startedAt: number | null | undefined) {
    if (!isAvailable() || !startedAt) return false;
    const eventTimestamp = DeviceActivity.userDefaultsGet<number>(
      `events_${BANKED_USAGE_ACTIVITY}_eventDidReachThreshold_${BANK_DEPLETED_EVENT}`,
    );
    return typeof eventTimestamp === 'number' && eventTimestamp >= startedAt;
  },

  getUsageBankProgressSeconds(startedAt: number | null | undefined) {
    if (!isAvailable() || !startedAt) return 0;

    return DeviceActivity.getEvents(BANKED_USAGE_ACTIVITY).reduce((latestProgress, event) => {
      if (
        event.callbackName !== 'eventDidReachThreshold'
        || event.lastCalledAt.getTime() < startedAt
      ) {
        return latestProgress;
      }

      if (event.eventName === BANK_DEPLETED_EVENT) {
        return Number.MAX_SAFE_INTEGER;
      }

      const progressSeconds = progressSecondsFromEventName(event.eventName, BANK_PROGRESS_EVENT_PREFIX);
      return progressSeconds === null ? latestProgress : Math.max(latestProgress, progressSeconds);
    }, 0);
  },

  hasUsageWindowDepleted(startedAt: number | null | undefined) {
    if (!isAvailable() || !startedAt) return false;
    const eventTimestamp = DeviceActivity.userDefaultsGet<number>(
      `events_${UNLOCK_ACTIVITY}_eventDidReachThreshold_${USAGE_WINDOW_DEPLETED_EVENT}`,
    );
    return typeof eventTimestamp === 'number' && eventTimestamp >= startedAt;
  },

  getUsageWindowProgressSeconds(startedAt: number | null | undefined) {
    if (!isAvailable() || !startedAt) return 0;

    return DeviceActivity.getEvents(UNLOCK_ACTIVITY).reduce((latestProgress, event) => {
      if (
        event.callbackName !== 'eventDidReachThreshold'
        || event.lastCalledAt.getTime() < startedAt
      ) {
        return latestProgress;
      }

      if (event.eventName === USAGE_WINDOW_DEPLETED_EVENT) {
        return Number.MAX_SAFE_INTEGER;
      }

      const progressSeconds = progressSecondsFromEventName(event.eventName, USAGE_WINDOW_PROGRESS_EVENT_PREFIX);
      return progressSeconds === null ? latestProgress : Math.max(latestProgress, progressSeconds);
    }, 0);
  },

  onUsageBankThreshold(listener: () => void) {
    if (!isAvailable()) return { remove: () => {} };

    return DeviceActivity.onDeviceActivityMonitorEvent((event) => {
      if (event.callbackName === 'eventDidReachThreshold') {
        listener();
      }
    });
  },

  async startUsageWindow(totalSeconds: number) {
    if (!isAvailable()) return;

    if (totalSeconds <= 0) {
      this.applyDefaultBlock();
      return;
    }

    const serializedSelection = getNormalizedStoredSelection();
    if (!serializedSelection) {
      console.warn('Cannot start usage window because no Screen Time selection is stored.');
      this.applyDefaultBlock();
      return;
    }

    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.cleanUpAfterActivity(UNLOCK_ACTIVITY);
    DeviceActivity.cleanUpAfterActivity(BANKED_USAGE_ACTIVITY);
    this.configureShield();
    DeviceActivity.clearWhitelistAndUpdateBlock('bootyblock-usage-window');

    DeviceActivity.configureActions({
      activityName: UNLOCK_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: USAGE_WINDOW_DEPLETED_EVENT,
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: SELECTION_ID,
          shieldId: SHIELD_ID,
        },
        {
          type: 'stopMonitoring',
          activityNames: [UNLOCK_ACTIVITY],
        },
      ],
    });

    DeviceActivity.addSelectionToWhitelistAndUpdateBlock(
      { activitySelectionToken: serializedSelection },
      'bootyblock-usage-window',
    );
    if (__DEV__) {
      console.log('Bootyblock bank whitelist applied', DeviceActivity.userDefaultsGet('lastBlockUpdate'));
    }

    await DeviceActivity.startMonitoring(
      UNLOCK_ACTIVITY,
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      buildUsageEvents(
        serializedSelection,
        totalSeconds,
        USAGE_WINDOW_DEPLETED_EVENT,
        USAGE_WINDOW_PROGRESS_EVENT_PREFIX,
      ),
    );

    DeviceActivity.unblockSelection({ activitySelectionToken: serializedSelection }, 'bootyblock-usage-window');
    DeviceActivity.refreshManagedSettingsStore();
    if (__DEV__) {
      console.log('Bootyblock usage window started', DeviceActivity.userDefaultsGet('lastBlockUpdate'));
    }
  },

  stopUsageWindow() {
    if (!isAvailable()) return;
    DeviceActivity.stopMonitoring([UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.cleanUpAfterActivity(UNLOCK_ACTIVITY);
    DeviceActivity.cleanUpAfterActivity(BANKED_USAGE_ACTIVITY);
  },

  async startAlwaysBlockMonitor() {
    if (!isAvailable()) return;
    this.configureShield();
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.configureActions({
      activityName: ALWAYS_BLOCK_ACTIVITY,
      callbackName: 'intervalDidStart',
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: SELECTION_ID,
          shieldId: SHIELD_ID,
        },
      ],
    });

    await DeviceActivity.startMonitoring(
      ALWAYS_BLOCK_ACTIVITY,
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      [],
    );
  },

  resetNativeSetup() {
    if (!isAvailable()) return;
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.resetBlocks('bootyblock-reset-app-data');
    DeviceActivity.userDefaultsClear();
  },
};
