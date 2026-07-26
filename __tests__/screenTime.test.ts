import * as DeviceActivity from 'react-native-device-activity';

jest.mock('react-native-device-activity', () => ({
  cleanUpAfterActivity: jest.fn(),
  clearWhitelist: jest.fn(),
  isAvailable: jest.fn(() => true),
  refreshManagedSettingsStore: jest.fn(),
  resetBlocks: jest.fn(),
  stopMonitoring: jest.fn(),
  userDefaultsClear: jest.fn(),
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

    expect(DeviceActivity.stopMonitoring).toHaveBeenCalledWith([
      ALWAYS_BLOCK_ACTIVITY,
      UNLOCK_ACTIVITY,
      BANKED_USAGE_ACTIVITY,
    ]);
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(ALWAYS_BLOCK_ACTIVITY);
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(UNLOCK_ACTIVITY);
    expect(DeviceActivity.cleanUpAfterActivity).toHaveBeenCalledWith(BANKED_USAGE_ACTIVITY);
    expect(DeviceActivity.clearWhitelist).toHaveBeenCalledTimes(1);
    expect(DeviceActivity.resetBlocks).toHaveBeenCalledWith('bootyblock-pro-access-inactive');
    expect(DeviceActivity.refreshManagedSettingsStore).toHaveBeenCalledTimes(1);
    expect(DeviceActivity.userDefaultsClear).not.toHaveBeenCalled();
  });
});
