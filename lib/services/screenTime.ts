import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { ALWAYS_BLOCK_ACTIVITY, SELECTION_ID, SHIELD_ID, UNLOCK_ACTIVITY } from '../../constants/bootyblock';

export type ScreenTimeStatus = 'unavailable' | 'notDetermined' | 'denied' | 'approved';

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

export const screenTimeService = {
  isAvailable,

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

    DeviceActivity.updateShieldWithId(
      {
        title: 'Bootyblock',
        subtitle: 'Earn your minutes with squats in Bootyblock.',
        primaryButtonLabel: 'Open Bootyblock',
        secondaryButtonLabel: 'Stay blocked',
        iconSystemName: 'figure.strengthtraining.traditional',
        backgroundBlurStyle: 10,
        titleColor: { red: 175, green: 21, blue: 85 },
        subtitleColor: { red: 58, green: 31, blue: 44 },
        primaryButtonBackgroundColor: { red: 233, green: 30, blue: 115 },
        primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
        secondaryButtonLabelColor: { red: 175, green: 21, blue: 85 },
      },
      {
        primary: {
          behavior: 'defer',
          actions: [{ type: 'openApp' }],
        },
        secondary: {
          behavior: 'close',
          actions: [],
        },
      },
      SHIELD_ID,
    );
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

  grantUnlock(minutes: number) {
    if (!isAvailable()) return;

    DeviceActivity.unblockSelection({ activitySelectionId: SELECTION_ID }, 'bootyblock-earned-unlock');

    const start = nowComponents(0);
    const end = nowComponents(minutes);

    DeviceActivity.configureActions({
      activityName: UNLOCK_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: SELECTION_ID,
          shieldId: SHIELD_ID,
        },
      ],
    });

    void DeviceActivity.startMonitoring(
      UNLOCK_ACTIVITY,
      {
        intervalStart: start,
        intervalEnd: end,
        repeats: false,
      },
      [],
    );
  },

  async startAlwaysBlockMonitor() {
    if (!isAvailable()) return;
    this.configureShield();
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
};
