import type { PostHog } from 'posthog-react-native';
import { useEffect } from 'react';

import { saveOnboardingCheckpoint } from './onboardingProgress';
import type { ScreenTimeSelectionSummary, ScreenTimeStatus } from './services/screenTime';

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;
type CleanAnalyticsProperties = Record<string, Exclude<AnalyticsValue, undefined>>;

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
export const POSTHOG_ENABLED = Boolean(POSTHOG_API_KEY);

function cleanProperties(properties?: AnalyticsProperties): CleanAnalyticsProperties | undefined {
  if (!properties) return undefined;

  const cleaned = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );

  return Object.keys(cleaned).length ? (cleaned as CleanAnalyticsProperties) : undefined;
}

export function captureAnalytics(
  posthog: PostHog | null | undefined,
  event: string,
  properties?: AnalyticsProperties,
) {
  if (!POSTHOG_ENABLED || !posthog) return;
  void posthog.capture(event, cleanProperties(properties));
}

export function screenAnalytics(
  posthog: PostHog | null | undefined,
  pathname: string,
  properties?: AnalyticsProperties,
) {
  if (!POSTHOG_ENABLED || !posthog) return;
  void posthog.screen(pathname, cleanProperties(properties));
}

export function trackOnboardingStepViewed(
  posthog: PostHog | null | undefined,
  route: string,
  stepKey: string,
  stepTitle: string,
  stepIndex?: number,
  stepCount?: number,
) {
  captureAnalytics(posthog, 'onboarding_step_viewed', {
    route,
    step_key: stepKey,
    step_title: stepTitle,
    step_index: stepIndex,
    step_count: stepCount,
  });
}

export function useOnboardingStepAnalytics(
  posthog: PostHog | null | undefined,
  route: string,
  stepKey: string,
  stepTitle: string,
  stepIndex?: number,
  stepCount?: number,
) {
  useEffect(() => {
    if (posthog !== null) {
      void saveOnboardingCheckpoint(route, stepKey);
    }
    trackOnboardingStepViewed(posthog, route, stepKey, stepTitle, stepIndex, stepCount);
  }, [posthog, route, stepKey, stepTitle, stepIndex, stepCount]);
}

export function selectionAnalyticsProperties(summary: ScreenTimeSelectionSummary | null) {
  return {
    app_count: summary?.applicationCount ?? 0,
    category_count: summary?.categoryCount ?? 0,
    website_count: summary?.webDomainCount ?? 0,
    total_count:
      (summary?.applicationCount ?? 0) +
      (summary?.categoryCount ?? 0) +
      (summary?.webDomainCount ?? 0),
  };
}

export function screenTimeStatusProperties(status: ScreenTimeStatus) {
  return {
    status,
    approved: status === 'approved',
  };
}
