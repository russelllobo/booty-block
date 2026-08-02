import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ONBOARDING_REVIEW_REQUESTED_KEY = 'bootyblock:onboarding-review-requested';

export async function requestOnboardingReviewOnce() {
  try {
    if (await AsyncStorage.getItem(ONBOARDING_REVIEW_REQUESTED_KEY)) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    await AsyncStorage.setItem(ONBOARDING_REVIEW_REQUESTED_KEY, new Date().toISOString());
    await StoreReview.requestReview();
  } catch (error) {
    console.warn('Native app review request failed:', error);
  }
}
