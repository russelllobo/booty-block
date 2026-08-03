import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { requestOnboardingReviewOnce } from '../lib/appReview';

const mockStoreReview = {
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: jest.fn(() => mockStoreReview),
}));

const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const requireOptionalStoreReview = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>;

describe('requestOnboardingReviewOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue(null);
    requireOptionalStoreReview.mockReturnValue(mockStoreReview);
    mockStoreReview.isAvailableAsync.mockResolvedValue(true);
  });

  it('records the request before opening the native review sheet', async () => {
    await requestOnboardingReviewOnce();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'bootyblock:onboarding-review-requested',
      expect.any(String),
    );
    expect(mockStoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does not ask again after a previous request', async () => {
    getItem.mockResolvedValue('2026-08-02T12:00:00.000Z');

    await requestOnboardingReviewOnce();

    expect(mockStoreReview.isAvailableAsync).not.toHaveBeenCalled();
    expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does not record a request when the native sheet is unavailable', async () => {
    mockStoreReview.isAvailableAsync.mockResolvedValue(false);

    await requestOnboardingReviewOnce();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does nothing when the installed binary does not include the native module', async () => {
    requireOptionalStoreReview.mockReturnValue(null);

    await requestOnboardingReviewOnce();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockStoreReview.isAvailableAsync).not.toHaveBeenCalled();
    expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
  });
});
