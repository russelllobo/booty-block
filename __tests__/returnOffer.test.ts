import {
  isReturnOfferDue,
  isReturnOfferPending,
  localDayKey,
  type ReturnOfferState,
} from '../lib/returnOffer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('return offer timing', () => {
  const at = (value: string) => new Date(value).getTime();

  it('does not show again on the same local day', () => {
    const state: ReturnOfferState = {
      onboardingPaywallSeenAt: at('2026-08-04T09:00:00'),
    };

    expect(isReturnOfferDue(state, at('2026-08-04T23:59:00'))).toBe(false);
  });

  it('shows on the next local calendar day', () => {
    const state: ReturnOfferState = {
      onboardingPaywallSeenAt: at('2026-08-04T23:58:00'),
    };

    expect(isReturnOfferDue(state, at('2026-08-05T00:01:00'))).toBe(true);
  });

  it('does not show after the return flow has been completed', () => {
    const state: ReturnOfferState = {
      onboardingPaywallSeenAt: at('2026-08-04T09:00:00'),
      returnFlowCompletedAt: at('2026-08-05T09:00:00'),
    };

    expect(isReturnOfferDue(state, at('2026-08-06T09:00:00'))).toBe(false);
    expect(isReturnOfferPending(state)).toBe(false);
  });

  it('keeps the secondary flow pending after the onboarding paywall is left', () => {
    expect(isReturnOfferPending({
      onboardingPaywallSeenAt: at('2026-08-04T09:00:00'),
    })).toBe(true);
  });

  it('uses a stable sortable key for local calendar days', () => {
    expect(localDayKey(at('2026-08-04T12:00:00'))).toBe(20260804);
  });
});
