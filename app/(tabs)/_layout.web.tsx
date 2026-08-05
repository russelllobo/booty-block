import { Tabs, useGlobalSearchParams } from 'expo-router';
import { Gamepad2, Home, LockKeyhole, Settings } from 'lucide-react-native';

import { appFontFamilyForWeight } from '../../components/AppText';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  const params = useGlobalSearchParams<{ hideTabs?: string }>();
  const tabsHidden = params.hideTabs === '1';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.raspberry,
        tabBarInactiveTintColor: colors.mink,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.petal,
          display: tabsHidden ? 'none' : 'flex',
          height: 82,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: appFontFamilyForWeight('600'),
          fontWeight: '600',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} stroke={String(color)} /> }} />
      <Tabs.Screen name="games" options={{ title: 'Games', tabBarIcon: ({ color }) => <Gamepad2 size={22} stroke={String(color)} /> }} />
      <Tabs.Screen name="lock-list" options={{ title: 'Lock List', tabBarIcon: ({ color }) => <LockKeyhole size={22} stroke={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} stroke={String(color)} /> }} />
    </Tabs>
  );
}
