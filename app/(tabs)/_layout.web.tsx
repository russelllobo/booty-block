import { Tabs } from 'expo-router';
import { Home, Settings } from 'lucide-react-native';

import { colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.raspberry,
        tabBarInactiveTintColor: colors.mink,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.petal,
          height: 82,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} stroke={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} stroke={String(color)} /> }} />
    </Tabs>
  );
}
