import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'pro';
export const REVENUECAT_NORMAL_OFFERING_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_NORMAL_OFFERING_ID ?? 'default';
export const REVENUECAT_ONE_TIME_OFFERING_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ONE_TIME_OFFERING_ID ?? 'one_time_offer';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const APPLE_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

let configured = false;

function getApiKey() {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return null;
}

function isNativePurchasePlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function assertConfigured() {
  if (!configured) {
    throw new Error('RevenueCat is not configured. Add your RevenueCat API key before testing subscriptions.');
  }
}

export function hasActiveEntitlement(customerInfo: CustomerInfo | null | undefined) {
  const entitlement = customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  if (!entitlement) return false;

  if (entitlement.expirationDate && entitlement.unsubscribeDetectedAt) {
    return false;
  }

  return true;
}

export type PaywallAccessResult = {
  active: boolean;
  cancelled: boolean;
  result: PAYWALL_RESULT;
};

function shouldRefreshAccessAfterPaywall(result: PAYWALL_RESULT) {
  return (
    result === PAYWALL_RESULT.NOT_PRESENTED ||
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED
  );
}

function hasAvailablePackages(offering: PurchasesOffering | null | undefined) {
  return (offering?.availablePackages?.length ?? 0) > 0;
}

async function getOfferingByIdentifier(identifier: string, missingMessage: string) {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[identifier];

  if (!hasAvailablePackages(offering)) {
    throw new Error(missingMessage);
  }

  return offering;
}

async function getNormalPaywallOffering(): Promise<PurchasesOffering> {
  const offerings = await Purchases.getOfferings();
  const preferred = offerings.all[REVENUECAT_NORMAL_OFFERING_ID];
  const current = offerings.current;

  if (hasAvailablePackages(preferred)) {
    return preferred;
  }

  if (
    current
    && current.identifier !== REVENUECAT_ONE_TIME_OFFERING_ID
    && hasAvailablePackages(current)
  ) {
    return current;
  }

  const fallback = Object.values(offerings.all).find((offering) => (
    offering.identifier !== REVENUECAT_ONE_TIME_OFFERING_ID
    && hasAvailablePackages(offering)
  ));

  if (fallback) {
    return fallback;
  }

  throw new Error(
    `No normal RevenueCat Offering with packages is available. Checked "${REVENUECAT_NORMAL_OFFERING_ID}".`,
  );
}

export const revenueCatService = {
  get entitlementId() {
    return REVENUECAT_ENTITLEMENT_ID;
  },

  get configured() {
    return configured;
  },

  get canUseNativePurchases() {
    return isNativePurchasePlatform() && Boolean(getApiKey());
  },

  configure() {
    if (configured || !isNativePurchasePlatform()) return configured;

    const apiKey = getApiKey();
    if (!apiKey) return false;

    if (__DEV__) {
      void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey } as Parameters<typeof Purchases.configure>[0]);
    configured = true;
    return true;
  },

  async getCustomerInfo() {
    assertConfigured();
    return Purchases.getCustomerInfo();
  },

  async restorePurchases() {
    assertConfigured();
    return Purchases.restorePurchases();
  },

  addCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener) {
    if (!configured) return () => undefined;

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  },

  async presentPaywallIfNeededWithResult(): Promise<PaywallAccessResult> {
    assertConfigured();
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
      displayCloseButton: true,
    });

    if (shouldRefreshAccessAfterPaywall(result)) {
      const customerInfo = await Purchases.getCustomerInfo();
      return {
        active: hasActiveEntitlement(customerInfo),
        cancelled: false,
        result,
      };
    }

    return {
      active: false,
      cancelled: result === PAYWALL_RESULT.CANCELLED,
      result,
    };
  },

  async presentPaywallWithResult(): Promise<PaywallAccessResult> {
    assertConfigured();
    const offering = await getNormalPaywallOffering();
    const result = await RevenueCatUI.presentPaywall({
      offering,
      displayCloseButton: true,
    });

    if (shouldRefreshAccessAfterPaywall(result)) {
      const customerInfo = await Purchases.getCustomerInfo();
      return {
        active: hasActiveEntitlement(customerInfo),
        cancelled: false,
        result,
      };
    }

    return {
      active: false,
      cancelled: result === PAYWALL_RESULT.CANCELLED,
      result,
    };
  },

  async presentOneTimeOfferPaywallWithResult(): Promise<PaywallAccessResult> {
    assertConfigured();
    const offering = await getOfferingByIdentifier(
      REVENUECAT_ONE_TIME_OFFERING_ID,
      `The one-time offer "${REVENUECAT_ONE_TIME_OFFERING_ID}" is not available right now. Check the RevenueCat Offering identifier.`,
    );

    const result = await RevenueCatUI.presentPaywall({
      offering,
      displayCloseButton: false,
    });

    if (shouldRefreshAccessAfterPaywall(result)) {
      const customerInfo = await Purchases.getCustomerInfo();
      return {
        active: hasActiveEntitlement(customerInfo),
        cancelled: false,
        result,
      };
    }

    return {
      active: false,
      cancelled: result === PAYWALL_RESULT.CANCELLED,
      result,
    };
  },

  async presentPaywallIfNeeded(options?: { force?: boolean }) {
    const outcome = options?.force
      ? await this.presentPaywallWithResult()
      : await this.presentPaywallIfNeededWithResult();
    return outcome.active;
  },

  async presentCustomerCenter() {
    if (configured) {
      try {
        await RevenueCatUI.presentCustomerCenter();
        return;
      } catch (error) {
        if (__DEV__) {
          console.warn('RevenueCat Customer Center unavailable, opening Apple subscriptions.', error);
        }
      }
    }

    await Linking.openURL(APPLE_MANAGE_SUBSCRIPTIONS_URL);
  },
};
