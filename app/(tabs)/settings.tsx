import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, FileText, LifeBuoy, RefreshCcw, RotateCcw, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';

import { Header } from '../../components/Header';
import { HomeShowcase, type HomeShowcaseStep } from '../../components/HomeShowcase';
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
  const params = useLocalSearchParams<{ showcase?: 'support' }>();
  const {
    subscriptionConfigured,
    isSubscribed,
    subscriptionError,
    restorePurchases,
    requestSubscriptionAccess,
    openSubscriptionManagement,
    resetAppData,
  } = useBootyblock();
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [showcaseStep, setShowcaseStep] = useState<HomeShowcaseStep | null>(null);
  const supportShowcaseTargetRef = useRef<View>(null);

  useEffect(() => {
    if (params.showcase === 'support') setShowcaseStep('support');
  }, [params.showcase]);

  const reset = () => {
    Alert.alert(
      'Reset bootyblock?',
      'This clears your setup and immediately removes bootyblock’s app restrictions on this iPhone.',
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

  async function restore() {
    setSubscriptionBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? 'Subscription restored' : 'No active subscription found',
        restored
          ? 'bootyblock Pro is active on this device.'
          : subscriptionError ?? 'No active bootyblock Pro purchase was found for this App Store account.',
      );
    } finally {
      setSubscriptionBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="Settings" />

      <View className="gap-7">
        <SettingsGroup title="Subscription">
          <SettingsRow
            title={isSubscribed ? 'bootyblock Pro' : subscriptionConfigured ? 'Not Subscribed' : 'Setup Needed'}
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

        <SettingsGroup title="Privacy">
          <SettingsRow
            title="Privacy Policy"
            icon={FileText}
            iconBackground="#007AFF"
            last
            onPress={() => void Linking.openURL('https://bootyblock.app/privacy')}
          />
        </SettingsGroup>

        <View ref={supportShowcaseTargetRef} collapsable={false}>
          <SettingsGroup title="Support">
            <SettingsRow
              title="Send Feedback"
              icon={LifeBuoy}
              iconBackground="#5856D6"
              last
              onPress={() => void Linking.openURL('mailto:r.lobo2003@gmail.com')}
            />
          </SettingsGroup>
        </View>

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

      <HomeShowcase
        step={showcaseStep}
        targetRef={supportShowcaseTargetRef}
        onAdvance={() => {
          setShowcaseStep(null);
          router.replace('/(tabs)');
        }}
      />

    </Screen>
  );
}
