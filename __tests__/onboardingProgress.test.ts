import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearOnboardingCheckpoint,
  getOnboardingResumeHref,
  saveOnboardingCheckpoint,
} from '../lib/onboardingProgress';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('onboarding progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores a saved route and exact step key', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({
      route: '/onboarding/setup',
      stepKey: 'setup_2',
    }));

    await expect(getOnboardingResumeHref()).resolves.toEqual({
      pathname: '/onboarding/setup',
      params: { resumeStep: 'setup_2' },
    });
  });

  it('falls back safely when the checkpoint is invalid', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({
      route: '/settings',
      stepKey: 'anything',
    }));

    await expect(getOnboardingResumeHref()).resolves.toBe('/onboarding');
  });

  it('saves valid onboarding routes and clears on completion', async () => {
    storage.setItem.mockResolvedValue();
    storage.removeItem.mockResolvedValue();

    await saveOnboardingCheckpoint('/onboarding/usage', 'current_daily_screen_time');
    expect(storage.setItem).toHaveBeenCalledWith(
      'bootyblock:onboarding-progress:v1',
      JSON.stringify({
        route: '/onboarding/usage',
        stepKey: 'current_daily_screen_time',
      }),
    );

    await clearOnboardingCheckpoint();
    expect(storage.removeItem).toHaveBeenCalledWith('bootyblock:onboarding-progress:v1');
  });
});
