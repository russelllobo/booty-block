import { DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '../../constants/theme';

const labelStyle = {
  default: { fontWeight: '600' as const, fontSize: 12, color: colors.mink },
  selected: { fontWeight: '600' as const, fontSize: 12, color: colors.raspberry },
};

export default function TabsLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <NativeTabs
        iconColor={{ default: colors.mink, selected: colors.raspberry }}
        labelStyle={labelStyle}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home_filled' }}
          />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="plan">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }}
            md="fitness_center"
          />
          <NativeTabs.Trigger.Label>Earn</NativeTabs.Trigger.Label>
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
