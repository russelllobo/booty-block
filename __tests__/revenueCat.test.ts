jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    addCustomerInfoUpdateListener: jest.fn(),
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: jest.fn(),
    setLogLevel: jest.fn(),
  },
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
  },
}));

jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {
    presentCustomerCenter: jest.fn(),
    presentPaywall: jest.fn(),
    presentPaywallIfNeeded: jest.fn(),
  },
  PAYWALL_RESULT: {
    CANCELLED: 'CANCELLED',
    NOT_PRESENTED: 'NOT_PRESENTED',
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
  },
}));

import {
  compareOneTimeOfferPrice,
  getPaywallOfferingDiagnostics,
  hasActiveEntitlement,
  REVENUECAT_ENTITLEMENT_ID,
} from '../lib/services/revenueCat';

function annualOffering(identifier: string, price: number, priceString: string, currencyCode = 'GBP') {
  const annualPackage = {
    identifier: '$rc_annual',
    product: {
      identifier: `${identifier}_yearly`,
      price,
      priceString,
      currencyCode,
      subscriptionPeriod: 'P1Y',
    },
  };

  return {
    identifier,
    annual: annualPackage,
    availablePackages: [annualPackage],
  } as never;
}

function customerInfoWithActiveEntitlement(entitlement: Record<string, unknown>) {
  return {
    entitlements: {
      active: {
        [REVENUECAT_ENTITLEMENT_ID]: entitlement,
      },
    },
  } as never;
}

describe('hasActiveEntitlement', () => {
  it('keeps access for a cancelled subscription until RevenueCat removes the active entitlement', () => {
    const customerInfo = customerInfoWithActiveEntitlement({
      expirationDate: '2026-08-08T12:00:00Z',
      unsubscribeDetectedAt: '2026-07-08T12:00:00Z',
    });

    expect(hasActiveEntitlement(customerInfo)).toBe(true);
  });

  it('returns false when RevenueCat has no active entitlement for Bootyblock Pro', () => {
    expect(hasActiveEntitlement({ entitlements: { active: {} } } as never)).toBe(false);
  });
});

describe('getPaywallOfferingDiagnostics', () => {
  it('records the products and localized prices that RevenueCat resolved on device', () => {
    const diagnostics = getPaywallOfferingDiagnostics({
      identifier: 'default',
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: {
            identifier: 'bootyblock_monthly',
            priceString: '£9.99',
            currencyCode: 'GBP',
          },
        },
        {
          identifier: '$rc_annual',
          product: {
            identifier: 'bootyblock_yearly',
            priceString: '£49.99',
            currencyCode: 'GBP',
          },
        },
      ],
    } as never);

    expect(diagnostics).toEqual({
      offeringIdentifier: 'default',
      packageCount: 2,
      packageIdentifiers: ['$rc_monthly', '$rc_annual'],
      productIdentifiers: ['bootyblock_monthly', 'bootyblock_yearly'],
      priceStrings: ['£9.99', '£49.99'],
      currencyCodes: ['GBP'],
    });
  });
});

describe('compareOneTimeOfferPrice', () => {
  it('allows a genuinely cheaper yearly follow-up offer', () => {
    const comparison = compareOneTimeOfferPrice(
      annualOffering('default', 49.99, '£49.99'),
      annualOffering('one_time_offer', 29.99, '£29.99'),
    );

    expect(comparison).toMatchObject({
      discounted: true,
      reason: 'discounted',
      normalPrice: 49.99,
      offerPrice: 29.99,
    });
  });

  it('rejects an equal-price follow-up offer', () => {
    const comparison = compareOneTimeOfferPrice(
      annualOffering('default', 799, '799 Kč', 'CZK'),
      annualOffering('one_time_offer', 799, '799 Kč', 'CZK'),
    );

    expect(comparison).toMatchObject({
      discounted: false,
      reason: 'not_discounted',
      normalPriceString: '799 Kč',
      offerPriceString: '799 Kč',
    });
  });

  it('rejects prices in different storefront currencies', () => {
    const comparison = compareOneTimeOfferPrice(
      annualOffering('default', 49.99, '£49.99'),
      annualOffering('one_time_offer', 29.99, '$29.99', 'USD'),
    );

    expect(comparison).toMatchObject({
      discounted: false,
      reason: 'currency_mismatch',
    });
  });
});
