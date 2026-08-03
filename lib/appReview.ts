import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const ONBOARDING_REVIEW_REQUESTED_KEY = 'bootyblock:onboarding-review-requested';

type StoreReviewModule = {
  isAvailableAsync?: () => Promise<boolean>;
  requestReview?: () => Promise<void>;
};

export async function requestOnboardingReviewOnce() {
  try {
    if (await AsyncStorage.getItem(ONBOARDING_REVIEW_REQUESTED_KEY)) return;

    const storeReview = requireOptionalNativeModule<StoreReviewModule>('ExpoStoreReview');
    if (!storeReview?.isAvailableAsync || !storeReview.requestReview) return;
    if (!(await storeReview.isAvailableAsync())) return;

    await AsyncStorage.setItem(ONBOARDING_REVIEW_REQUESTED_KEY, new Date().toISOString());
    await storeReview.requestReview();
  } catch (error) {
    console.warn('Native app review request failed:', error);
  }
}
