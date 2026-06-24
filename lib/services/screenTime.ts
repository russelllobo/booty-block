import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { ALWAYS_BLOCK_ACTIVITY, SELECTION_ID, SHIELD_ID, UNLOCK_ACTIVITY } from '../../constants/bootyblock';

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

function nowComponents(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

const minimumMonitoringIntervalMinutes = 15;

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
      subtitle: 'Open Bootyblock to choose how many minutes to unlock.',
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
    this.configureShield();
    DeviceActivity.blockSelection({ activitySelectionId: SELECTION_ID }, 'bootyblock-default-block');
  },

  saveNativeSelectionConfigured() {
    if (!isAvailable()) return;
    this.configureShield();
    this.applyDefaultBlock();
  },

  async grantUnlock(minutes: number) {
    if (!isAvailable()) return;

    // Only one monitor should be able to mutate the shield during an earned unlock.
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY]);

    DeviceActivity.configureActions({
      activityName: UNLOCK_ACTIVITY,
      callbackName: 'intervalDidStart',
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: SELECTION_ID,
          shieldId: SHIELD_ID,
        },
      ],
    });

    // DeviceActivity schedules must last at least 15 minutes. Start the monitor
    // when the earned time expires, then use intervalDidStart to re-apply the
    // block at that exact moment. This also supports 5- and 10-minute unlocks.
    await DeviceActivity.startMonitoring(
      UNLOCK_ACTIVITY,
      {
        intervalStart: nowComponents(minutes),
        intervalEnd: nowComponents(minutes + minimumMonitoringIntervalMinutes),
        repeats: false,
      },
      [],
    );

    // Arm the automatic re-lock before removing the current shield.
    DeviceActivity.unblockSelection(
      { activitySelectionId: SELECTION_ID },
      'bootyblock-earned-unlock',
    );
  },

  async startAlwaysBlockMonitor() {
    if (!isAvailable()) return;
    this.configureShield();
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY]);
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
    DeviceActivity.stopMonitoring([ALWAYS_BLOCK_ACTIVITY, UNLOCK_ACTIVITY]);
    DeviceActivity.resetBlocks('bootyblock-reset-app-data');
    DeviceActivity.userDefaultsClear();
  },
};
