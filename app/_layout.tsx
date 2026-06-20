import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { BootyblockProvider } from '../lib/store/BootyblockProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <BootyblockProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding/index" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding/permissions" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding/quiz" options={{ animation: 'none' }} />
            <Stack.Screen
              name="onboarding/usage"
              options={{ animation: 'none', gestureEnabled: false }}
            />
            <Stack.Screen name="onboarding/insights" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding/screentime" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding/apps" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding/calibration" options={{ animation: 'none' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="session" />
            <Stack.Screen name="success" />
          </Stack>
        </BootyblockProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
