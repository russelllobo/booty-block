import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';

const ONBOARDING_PROGRESS_KEY = 'bootyblock:onboarding-progress:v1';

const resumableRoutes = new Set([
  '/onboarding',
  '/onboarding/quiz',
  '/onboarding/usage',
  '/onboarding/insights',
  '/onboarding/setup',
  '/onboarding/calibration',
  '/onboarding/routine-reminder',
  '/onboarding/activity',
  '/onboarding/finish',
  '/onboarding/screentime',
  '/onboarding/notifications',
  '/onboarding/social-proof',
  '/onboarding/calculating',
  '/onboarding/wellbeing-plan',
  '/onboarding/apps',
]);

type OnboardingCheckpoint = {
  route: string;
  stepKey: string;
};

export async function saveOnboardingCheckpoint(route: string, stepKey: string) {
  if (!resumableRoutes.has(route)) return;

  try {
    const checkpoint: OnboardingCheckpoint = { route, stepKey };
    await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(checkpoint));
  } catch {
    // A storage failure should never block onboarding navigation.
  }
}

export async function getOnboardingResumeHref(): Promise<Href> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return '/onboarding';

    const checkpoint = JSON.parse(raw) as Partial<OnboardingCheckpoint>;
    if (
      typeof checkpoint.route !== 'string'
      || !resumableRoutes.has(checkpoint.route)
      || typeof checkpoint.stepKey !== 'string'
    ) {
      return '/onboarding';
    }

    return {
      pathname: checkpoint.route as Href,
      params: { resumeStep: checkpoint.stepKey },
    } as Href;
  } catch {
    return '/onboarding';
  }
}

export async function clearOnboardingCheckpoint() {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch {
    // Completion should still succeed if local storage is temporarily unavailable.
  }
}
