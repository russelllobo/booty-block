import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

import { requestOnboardingReviewOnce } from '../lib/appReview';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const isAvailableAsync = StoreReview.isAvailableAsync as jest.MockedFunction<
  typeof StoreReview.isAvailableAsync
>;

describe('requestOnboardingReviewOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue(null);
    isAvailableAsync.mockResolvedValue(true);
  });

  it('records the request before opening the native review sheet', async () => {
    await requestOnboardingReviewOnce();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'bootyblock:onboarding-review-requested',
      expect.any(String),
    );
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does not ask again after a previous request', async () => {
    getItem.mockResolvedValue('2026-08-02T12:00:00.000Z');

    await requestOnboardingReviewOnce();

    expect(StoreReview.isAvailableAsync).not.toHaveBeenCalled();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does not record a request when the native sheet is unavailable', async () => {
    isAvailableAsync.mockResolvedValue(false);

    await requestOnboardingReviewOnce();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
});
