import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function UnlockGuidePreview() {
  const { step } = useLocalSearchParams<{ step?: '1' | '2' | '3' }>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { unlockGuide: '1', unlockGuideStep: step ?? '1' },
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [step]);

  return null;
}
