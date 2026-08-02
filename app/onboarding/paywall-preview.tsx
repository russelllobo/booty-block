import type { PurchasesOffering } from 'react-native-purchases';

import { SubscriptionPaywall } from '../../components/SubscriptionPaywall';

const previewOffering = {
  identifier: 'preview-default',
  availablePackages: [
    {
      identifier: '$rc_annual',
      packageType: 'ANNUAL',
      product: {
        identifier: 'bootyblock_yearly',
        currencyCode: 'GBP',
        introPrice: {
          cycles: 1,
          period: 'P3D',
          periodNumberOfUnits: 3,
          periodUnit: 'DAY',
          price: 0,
          priceString: '£0.00',
        },
        price: 29.99,
        pricePerWeekString: '£0.58',
        priceString: '£29.99',
        subscriptionPeriod: 'P1Y',
      },
    },
    {
      identifier: '$rc_weekly',
      packageType: 'WEEKLY',
      product: {
        identifier: 'bootyblock_weekly',
        currencyCode: 'GBP',
        introPrice: null,
        price: 9.99,
        pricePerWeekString: '£9.99',
        priceString: '£9.99',
        subscriptionPeriod: 'P1W',
      },
    },
  ],
} as PurchasesOffering;

export default function PaywallPreview() {
  return (
    <SubscriptionPaywall
      offering={previewOffering}
      onClose={() => undefined}
      onPurchase={async () => false}
      onRestore={async () => false}
    />
  );
}
