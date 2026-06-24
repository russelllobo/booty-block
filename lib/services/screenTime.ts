import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import {
  ALWAYS_BLOCK_ACTIVITY,
  BANK_DEPLETED_EVENT,
  BANKED_USAGE_ACTIVITY,
  SELECTION_ID,
  SHIELD_ID,
  UNLOCK_ACTIVITY,
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
  type: 'openUrlWithDispatch';
  url: string;
};

type ShieldActionsWithUrl = Omit<DeviceActivity.ShieldActions, 'primary'> & {
  primary: ShieldActionWithUrl;
};

const approved = 2;
const denied = 1;
const notDetermined = 0;

function toStatus(status: number | undefined): ScreenTimeStatus {
  if (status === approved) return 'approved';
  if (status === denied) return 'denied';
  if (status === notDetermined) return 'notDetermined';
  return 'unavailable';
}

function isAvailable() {
  return Platform.OS === 'ios' && DeviceActivity.isAvailable?.();
}

function durationComponents(totalMinutes: number) {
  const minutes = Math.max(1, Math.round(totalMinutes));
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    second: 0,
  };
}

function selectionCount(summary: ScreenTimeSelectionSummary | null) {
  if (!summary) return 0;
  return summary.applicationCount + summary.categoryCount + summary.webDomainCount;
}

function selectionPart(count: number, singular: string, plural = `${singular}s`) {
  return count > 0 ? `${count} ${count === 1 ? singular : plural}` : null;
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

    const shieldConfiguration: DeviceActivity.ShieldConfiguration = {
      title: 'Bootyblock',
      subtitle: 'Your bank is empty. Do squats in Bootyblock to earn more app time.',
      primaryButtonLabel: 'Open Bootyblock',
      iconSystemName: 'figure.strengthtraining.traditional',
      backgroundBlurStyle: 10,
      titleColor: { red: 175, green: 21, blue: 85 },
      subtitleColor: { red: 58, green: 31, blue: 44 },
      primaryButtonBackgroundColor: { red: 233, green: 30, blue: 115 },
      primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
    };
    const shieldActions: ShieldActionsWithUrl = {
      primary: {
        behavior: 'close',
        type: 'openUrlWithDispatch',
        url: 'bootyblock://unlock',
      },
    };

    DeviceActivity.userDefaultsClearWithPrefix('shieldConfigurationForSelection');
    DeviceActivity.userDefaultsClearWithPrefix('shieldActionsForSelection');
    DeviceActivity.updateShield(shieldConfiguration, shieldActions as unknown as DeviceActivity.ShieldActions, 'bootyblock-configure-shield');
    DeviceActivity.updateShieldWithId(shieldConfiguration, shieldActions as unknown as DeviceActivity.ShieldActions, SHIELD_ID);
  },

  applyDefaultBlock() {
    if (!isAvailable()) return;
    DeviceActivity.stopMonitoring([BANKED_USAGE_ACTIVITY, UNLOCK_ACTIVITY]);
    this.configureShield();
    DeviceActivity.blockSelection({ activitySelectionId: SELECTION_ID }, 'bootyblock-default-block');
  },

  saveNativeSelectionConfigured() {
    if (!isAvailable()) return;
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

  async startUsageBankMonitor(minutes: number) {
    if (!isAvailable()) return;

    if (minutes <= 0) {
      this.applyDefaultBlock();
      return;
    }

    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
    DeviceActivity.cleanUpAfterActivity(BANKED_USAGE_ACTIVITY);
    this.configureShield();

    DeviceActivity.configureActions({
      activityName: BANKED_USAGE_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: BANK_DEPLETED_EVENT,
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: SELECTION_ID,
          shieldId: SHIELD_ID,
        },
      ],
    });

    await DeviceActivity.startMonitoring(
      BANKED_USAGE_ACTIVITY,
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      [
        {
          familyActivitySelection: SELECTION_ID,
          threshold: durationComponents(minutes),
          eventName: BANK_DEPLETED_EVENT,
          includesPastActivity: false,
        },
      ],
    );

    DeviceActivity.unblockSelection(
      { activitySelectionId: SELECTION_ID },
      'bootyblock-banked-usage',
    );
  },

  async startAlwaysBlockMonitor() {
    if (!isAvailable()) return;
    this.configureShield();
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, BANKED_USAGE_ACTIVITY]);
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
