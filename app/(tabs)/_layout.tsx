import * as Haptics from 'expo-haptics';
import { DefaultTheme, ThemeProvider, useLocalSearchParams } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '../../constants/theme';

const labelStyle = {
  default: { fontWeight: '600' as const, fontSize: 12, color: colors.mink },
  selected: { fontWeight: '600' as const, fontSize: 12, color: colors.raspberry },
};

export default function TabsLayout() {
  const params = useLocalSearchParams<{ hideTabs?: string }>();
  const tabsHidden = params.hideTabs === '1';

  return (
    <ThemeProvider value={DefaultTheme}>
      <NativeTabs
        {...(tabsHidden ? { hidden: true } : {})}
        iconColor={{ default: colors.mink, selected: colors.raspberry }}
        labelStyle={labelStyle}
        screenListeners={{
          tabPress: (event) => {
            if (event.data.isPrevented) return;

            void Haptics.selectionAsync().catch(() => {});
          },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home_filled' }}
          />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
            md="settings"
          />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
