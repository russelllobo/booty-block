import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Index() {
  const { hydrated, onboardingComplete } = useBootyblock();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(onboardingComplete ? '/(tabs)' : '/onboarding');
  }, [hydrated, onboardingComplete]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
        <ActivityIndicator color={colors.raspberry} />
        <Text style={{ marginTop: 16, color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>
          Loading Bootyblock...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush }}>
      <ActivityIndicator color={colors.raspberry} />
      <Text style={{ marginTop: 16, color: colors.cocoa, fontSize: 18, fontWeight: '700' }}>
        Opening Bootyblock...
      </Text>
    </View>
  );
}
