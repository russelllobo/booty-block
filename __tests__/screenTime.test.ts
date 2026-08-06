import * as DeviceActivity from 'react-native-device-activity';

jest.mock('react-native-device-activity', () => ({
  cleanUpAfterActivity: jest.fn(),
  clearWhitelist: jest.fn(),
  isAvailable: jest.fn(() => true),
  refreshManagedSettingsStore: jest.fn(),
  resetBlocks: jest.fn(),
  stopMonitoring: jest.fn(),
  updateShield: jest.fn(),
  updateShieldWithId: jest.fn(),
  userDefaultsClear: jest.fn(),
  userDefaultsClearWithPrefix: jest.fn(),
  userDefaultsRemove: jest.fn(),
}));

import {
  ALWAYS_BLOCK_ACTIVITY,
  BANKED_USAGE_ACTIVITY,
  UNLOCK_ACTIVITY,
} from '../constants/bootyblock';
import { screenTimeService } from '../lib/services/screenTime';

describe('screenTimeService.releaseAllBlocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes restrictions and monitoring without deleting the saved app selection', () => {
    screenTimeService.releaseAllBlocks();

    expect(DeviceActivity.stopMonitoring).toHaveBeenCalledWith();
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(ALWAYS_BLOCK_ACTIVITY);
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(UNLOCK_ACTIVITY);
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(BANKED_USAGE_ACTIVITY);
    expect(DeviceActivity.clearWhitelist).toHaveBeenCalledTimes(1);
    expect(DeviceActivity.resetBlocks).toHaveBeenCalledWith('bootyblock-pro-access-inactive');
    expect(DeviceActivity.refreshManagedSettingsStore).toHaveBeenCalledTimes(1);
    expect(DeviceActivity.userDefaultsClear).not.toHaveBeenCalled();
  });
});

describe('screenTimeService.configureShield', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends an unlock notification from the primary shield button', () => {
    screenTimeService.configureShield();

    expect(DeviceActivity.updateShield).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryButtonLabel: "Let's squat 🍑",
      }),
      {
        primary: {
          behavior: 'close',
          actions: [
            {
              type: 'sendNotification',
              payload: expect.objectContaining({
                title: 'Your apps are blocked!',
                body: 'Tap to squat and unlock them.',
                userInfo: expect.objectContaining({ kind: 'shield_unlock' }),
              }),
            },
          ],
        },
      },
      'bootyblock-configure-shield',
    );
  });
});
