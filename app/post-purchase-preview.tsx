import { router } from 'expo-router';
import { useEffect } from 'react';

export default function PostPurchasePreview() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { postPurchasePreview: '1' },
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
