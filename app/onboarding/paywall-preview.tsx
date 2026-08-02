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
        introPrice: null,
        priceString: '£49.99',
        subscriptionPeriod: 'P1Y',
      },
    },
    {
      identifier: '$rc_monthly',
      packageType: 'MONTHLY',
      product: {
        identifier: 'bootyblock_monthly',
        currencyCode: 'GBP',
        introPrice: null,
        priceString: '£9.99',
        subscriptionPeriod: 'P1M',
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
