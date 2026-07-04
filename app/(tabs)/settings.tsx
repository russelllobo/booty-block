import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { AppWindow, ChevronRight, FileText, LifeBuoy, RefreshCcw, RotateCcw, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

type SettingsGroupProps = {
  title?: string;
  children: ReactNode;
};

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  destructive?: boolean;
  last?: boolean;
  loading?: boolean;
  showChevron?: boolean;
  onPress: () => void;
};

function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <View>
      {title ? (
        <Text className="mb-2 ml-4 text-[13px] font-semibold uppercase text-[#6D6D72]">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[14px] bg-white">
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  title,
  subtitle,
  icon: Icon,
  iconColor = colors.white,
  iconBackground = colors.raspberry,
  destructive,
  last,
  loading,
  showChevron = true,
  onPress,
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      className="min-h-[58px] flex-row items-center bg-white pl-4 active:bg-[#E5E5EA]"
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-[7px]"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon size={19} stroke={iconColor} strokeWidth={2.3} />
      </View>
      <View
        className={[
          'ml-3 flex-1 py-3 pr-3',
          last ? '' : 'border-b border-[#C6C6C8]/70',
        ].join(' ')}
      >
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text
              className={[
                'text-[17px] font-normal leading-6',
                destructive ? 'text-[#FF3B30]' : 'text-[#1C1C1E]',
              ].join(' ')}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-0.5 text-[13px] font-normal leading-4 text-[#6D6D72]">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {loading ? (
            <ActivityIndicator color={colors.raspberry} />
          ) : showChevron ? (
            <ChevronRight size={19} stroke="#C7C7CC" strokeWidth={2.2} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Settings() {
  const {
    subscriptionConfigured,
    isSubscribed,
    subscriptionError,
    restorePurchases,
    requestSubscriptionAccess,
    openSubscriptionManagement,
    resetAppData,
    selectedAppsLabel,
  } = useBootyblock();
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);

  const reset = () => {
    Alert.alert(
      'Reset Bootyblock?',
      'This clears your setup and immediately removes Bootyblock’s app restrictions on this iPhone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetAppData().then(() => router.replace('/onboarding'));
          },
        },
      ],
    );
  };

  async function subscribeOrManage() {
    setSubscriptionBusy(true);
    try {
      if (isSubscribed) {
        await openSubscriptionManagement();
        return;
      }

      const subscribed = await requestSubscriptionAccess();
      if (!subscribed && !subscriptionConfigured) {
        Alert.alert(
          'RevenueCat setup needed',
          subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
      }
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function chooseBlockedApps() {
    if (isSubscribed) {
      router.push('/onboarding/apps');
      return;
    }

    setSubscriptionBusy(true);
    try {
      const subscribed = await requestSubscriptionAccess();
      if (subscribed) {
        router.push('/onboarding/apps');
        return;
      }

      if (!subscriptionConfigured) {
        Alert.alert(
          'RevenueCat setup needed',
          subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
      }
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function restore() {
    setSubscriptionBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? 'Subscription restored' : 'No active subscription found',
        restored
          ? 'Bootyblock Pro is active on this device.'
          : subscriptionError ?? 'No active Bootyblock Pro purchase was found for this App Store account.',
      );
    } finally {
      setSubscriptionBusy(false);
    }
  }

  return (
    <Screen backgroundColor="#F2F2F7">
      <Header title="Settings" />

      <View className="gap-7">
        <SettingsGroup title="Blocking">
          <SettingsRow
            title="Choose blocked apps"
            subtitle={selectedAppsLabel}
            icon={AppWindow}
            iconBackground={colors.cocoa}
            loading={subscriptionBusy && !isSubscribed}
            last
            onPress={chooseBlockedApps}
          />
        </SettingsGroup>

        <SettingsGroup title="Subscription">
          <SettingsRow
            title={isSubscribed ? 'Bootyblock Pro' : subscriptionConfigured ? 'Not Subscribed' : 'Setup Needed'}
            subtitle={
              subscriptionConfigured
                ? isSubscribed
                  ? 'Manage your subscription.'
                  : 'Subscribe to keep blocking active.'
                : 'Add a RevenueCat API key to enable purchases.'
            }
            icon={Sparkles}
            iconBackground={colors.raspberry}
            loading={subscriptionBusy}
            onPress={subscribeOrManage}
          />
          <SettingsRow
            title="Restore Purchases"
            icon={RefreshCcw}
            iconBackground="#34C759"
            loading={subscriptionBusy}
            last
            onPress={restore}
          />
        </SettingsGroup>

        <SettingsGroup title="Privacy & Support">
          <SettingsRow
            title="Privacy Policy"
            icon={FileText}
            iconBackground="#007AFF"
            onPress={() => void Linking.openURL('https://bootyblock.app/privacy')}
          />
          <SettingsRow
            title="Support"
            icon={LifeBuoy}
            iconBackground="#5856D6"
            last
            onPress={() => void Linking.openURL('https://bootyblock.app/support')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title="Reset App Data"
            icon={RotateCcw}
            iconBackground="#FF3B30"
            destructive
            last
            onPress={reset}
          />
        </SettingsGroup>
      </View>

    </Screen>
  );
}
