import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
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
  return Boolean(entitlement);
}

export type PaywallAccessResult = {
  active: boolean;
  cancelled: boolean;
  result: PAYWALL_RESULT;
  offering?: PaywallOfferingDiagnostics;
};

export type PaywallOfferingDiagnostics = {
  offeringIdentifier: string;
  packageCount: number;
  packageIdentifiers: string[];
  productIdentifiers: string[];
  priceStrings: string[];
  currencyCodes: string[];
};

export type OneTimeOfferPriceComparison = {
  discounted: boolean;
  reason: 'discounted' | 'missing_annual_product' | 'currency_mismatch' | 'not_discounted';
  normalPrice: number | null;
  normalPriceString: string | null;
  normalCurrencyCode: string | null;
  offerPrice: number | null;
  offerPriceString: string | null;
  offerCurrencyCode: string | null;
};

export class OneTimeOfferNotDiscountedError extends Error {
  comparison: OneTimeOfferPriceComparison;

  constructor(comparison: OneTimeOfferPriceComparison) {
    super('The one-time offer is not cheaper than the normal yearly subscription.');
    this.name = 'OneTimeOfferNotDiscountedError';
    this.comparison = comparison;
  }
}

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

function getAnnualProduct(offering: PurchasesOffering) {
  return offering.annual?.product
    ?? offering.availablePackages.find((item) => item.product.subscriptionPeriod === 'P1Y')?.product
    ?? null;
}

export function compareOneTimeOfferPrice(
  normalOffering: PurchasesOffering,
  offerOffering: PurchasesOffering,
): OneTimeOfferPriceComparison {
  const normalProduct = getAnnualProduct(normalOffering);
  const offerProduct = getAnnualProduct(offerOffering);
  const comparison = {
    normalPrice: normalProduct?.price ?? null,
    normalPriceString: normalProduct?.priceString ?? null,
    normalCurrencyCode: normalProduct?.currencyCode ?? null,
    offerPrice: offerProduct?.price ?? null,
    offerPriceString: offerProduct?.priceString ?? null,
    offerCurrencyCode: offerProduct?.currencyCode ?? null,
  };

  if (!normalProduct || !offerProduct) {
    return { discounted: false, reason: 'missing_annual_product', ...comparison };
  }

  if (normalProduct.currencyCode !== offerProduct.currencyCode) {
    return { discounted: false, reason: 'currency_mismatch', ...comparison };
  }

  if (offerProduct.price >= normalProduct.price) {
    return { discounted: false, reason: 'not_discounted', ...comparison };
  }

  return { discounted: true, reason: 'discounted', ...comparison };
}

export function getPaywallOfferingDiagnostics(
  offering: PurchasesOffering,
): PaywallOfferingDiagnostics {
  const packages = offering.availablePackages;

  return {
    offeringIdentifier: offering.identifier,
    packageCount: packages.length,
    packageIdentifiers: packages.map((item) => item.identifier),
    productIdentifiers: packages.map((item) => item.product.identifier),
    priceStrings: packages.map((item) => item.product.priceString),
    currencyCodes: [...new Set(packages.map((item) => item.product.currencyCode))],
  };
}

function getOfferingByIdentifier(
  offerings: PurchasesOfferings,
  identifier: string,
  missingMessage: string,
) {
  const offering = offerings.all[identifier];

  if (!hasAvailablePackages(offering)) {
    throw new Error(missingMessage);
  }

  return offering;
}

function getNormalPaywallOffering(offerings: PurchasesOfferings): PurchasesOffering {
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

async function getValidatedOneTimeOfferPaywallOffering() {
  const offerings = await Purchases.getOfferings();
  const normalOffering = getNormalPaywallOffering(offerings);
  const offerOffering = getOfferingByIdentifier(
    offerings,
    REVENUECAT_ONE_TIME_OFFERING_ID,
    `The one-time offer "${REVENUECAT_ONE_TIME_OFFERING_ID}" is not available right now. Check the RevenueCat Offering identifier.`,
  );
  const comparison = compareOneTimeOfferPrice(normalOffering, offerOffering);

  if (!comparison.discounted) {
    throw new OneTimeOfferNotDiscountedError(comparison);
  }

  return offerOffering;
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

  async getNormalPaywallOffering() {
    assertConfigured();
    return getNormalPaywallOffering(await Purchases.getOfferings());
  },

  async purchasePackage(selectedPackage: PurchasesPackage) {
    assertConfigured();
    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    return hasActiveEntitlement(customerInfo);
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

  async presentPaywallWithResult(
    onOfferingResolved?: (diagnostics: PaywallOfferingDiagnostics) => void,
  ): Promise<PaywallAccessResult> {
    assertConfigured();
    const offering = getNormalPaywallOffering(await Purchases.getOfferings());
    const offeringDiagnostics = getPaywallOfferingDiagnostics(offering);
    onOfferingResolved?.(offeringDiagnostics);
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
        offering: offeringDiagnostics,
      };
    }

    return {
      active: false,
      cancelled: result === PAYWALL_RESULT.CANCELLED,
      result,
      offering: offeringDiagnostics,
    };
  },

  async presentOneTimeOfferPaywallWithResult(): Promise<PaywallAccessResult> {
    assertConfigured();
    const offering = await getValidatedOneTimeOfferPaywallOffering();
    const offeringDiagnostics = getPaywallOfferingDiagnostics(offering);

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
        offering: offeringDiagnostics,
      };
    }

    return {
      active: false,
      cancelled: result === PAYWALL_RESULT.CANCELLED,
      result,
      offering: offeringDiagnostics,
    };
  },

  async getOneTimeOfferPaywallOffering() {
    assertConfigured();
    return getValidatedOneTimeOfferPaywallOffering();
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
