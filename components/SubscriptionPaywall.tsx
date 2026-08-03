import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronRight, Dumbbell, LockKeyhole, RefreshCw, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { Text } from './AppText';

const heroArt = require('../assets/onboarding/body-transformation-transparent.png');
const laurelWreath = require('../assets/onboarding/gold-laurel-wreath.png');

type Props = {
  offering: PurchasesOffering;
  onClose: () => void;
  onPurchase: (selectedPackage: PurchasesPackage) => Promise<boolean>;
  onRestore: () => Promise<boolean>;
};

function periodName(subscriptionPeriod: string | null) {
  switch (subscriptionPeriod) {
    case 'P1W': return '1 week';
    case 'P1M': return '1 month';
    case 'P2M': return '2 months';
    case 'P3M': return '3 months';
    case 'P6M': return '6 months';
    case 'P1Y': return '1 year';
    default: return 'Full access';
  }
}

function packageRank(item: PurchasesPackage) {
  if (item.product.subscriptionPeriod === 'P1Y') return 0;
  if (item.product.subscriptionPeriod === 'P1W') return 1;
  if (item.product.subscriptionPeriod === 'P1M') return 2;
  return 2;
}

function trialName(item: PurchasesPackage) {
  const introPrice = item.product.introPrice;
  if (!introPrice || introPrice.price !== 0) return null;
  if (introPrice.period === 'P3D') return '3 days';
  if (introPrice.period === 'P1W') return '1 week';
  if (introPrice.period === 'P2W') return '2 weeks';
  if (introPrice.period === 'P1M') return '1 month';
  return null;
}

function WreathHalf({ side }: { side: 'left' | 'right' }) {
  const halfWidth = 48;
  const imageHeight = Math.round(halfWidth * 2 * (562 / 610));

  return (
    <View style={{ height: imageHeight, overflow: 'hidden', width: halfWidth }}>
      <Image
        source={laurelWreath}
        accessible={false}
        resizeMode="stretch"
        tintColor={colors.white}
        style={{
          height: imageHeight,
          left: side === 'left' ? 0 : -halfWidth,
          position: 'absolute',
          width: halfWidth * 2,
        }}
      />
    </View>
  );
}

export function SubscriptionPaywall({ offering, onClose, onPurchase, onRestore }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const packages = useMemo(
    () => [...offering.availablePackages].sort((a, b) => packageRank(a) - packageRank(b)),
    [offering.availablePackages],
  );
  const [selectedPackage, setSelectedPackage] = useState(packages[0]);
  const [busyAction, setBusyAction] = useState<'purchase' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const selectedTrial = trialName(selectedPackage);

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();

  }, [entrance]);

  const renewalUnit = periodName(selectedPackage.product.subscriptionPeriod).replace(/^1 /, '');
  const selectedWeeklyEquivalent = selectedPackage.product.pricePerWeekString;

  const purchase = async () => {
    if (busyAction) return;
    setBusyAction('purchase');
    setError(null);
    try {
      await onPurchase(selectedPackage);
    } catch (purchaseError) {
      const details = purchaseError && typeof purchaseError === 'object'
        ? purchaseError as Record<string, unknown>
        : {};
      if (String(details.code) !== '1' && details.userCancelled !== true) {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const restore = async () => {
    if (busyAction) return;
    setBusyAction('restore');
    setError(null);
    try {
      const restored = await onRestore();
      if (!restored) setError('No active purchase was found.');
    } catch {
      setError('Your purchases could not be restored. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" animated />
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <Image
          source={heroArt}
          resizeMode="contain"
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['rgba(39,0,25,0.02)', 'rgba(174,10,87,0.20)', colors.raspberry]}
          locations={[0.15, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          accessibilityLabel="Close subscription offer"
          accessibilityRole="button"
          disabled={Boolean(busyAction)}
          hitSlop={12}
          onPress={onClose}
          style={[styles.closeButton, { top: Math.max(insets.top, 12) + 2 }]}
        >
          <X color={colors.white} size={21} strokeWidth={2.7} />
        </Pressable>

        <Animated.View
          style={[
            styles.socialProof,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <View style={styles.wreathRow}>
            <WreathHalf side="left" />
            <Text style={styles.wreathCopy}>THE #1 APP FOR{`\n`}BOOTY FOCUS</Text>
            <WreathHalf side="right" />
          </View>
          <View style={styles.ratingRow}>
            <Text accessibilityLabel="5 out of 5 stars" style={styles.stars}>★★★★★</Text>
          </View>
        </Animated.View>
      </View>

      <LinearGradient colors={[colors.raspberry, '#F23F8B', colors.petal]} style={styles.body}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
            { paddingBottom: Math.max(insets.bottom, 8) + 8 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              flex: 1,
              justifyContent: 'space-evenly',
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            }}
          >
            <Text style={[styles.title, compact && styles.titleCompact]}>build the confidence you deserve</Text>

            <View style={[styles.benefits, compact && styles.benefitsCompact]}>
              <View style={styles.benefitRow}>
                <LockKeyhole color={colors.white} size={19} strokeWidth={2.5} />
                <Text style={styles.benefitText}>block distracting apps until you squat</Text>
              </View>
              <View style={styles.benefitRow}>
                <Dumbbell color={colors.white} size={19} strokeWidth={2.5} />
                <Text style={styles.benefitText}>turn screen time into a stronger body</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check color={colors.white} size={20} strokeWidth={3} />
                <Text style={styles.benefitText}>build a routine that actually sticks</Text>
              </View>
            </View>

            <View style={[styles.planList, compact && styles.planListCompact]}>
              {packages.map((item) => {
                const selected = selectedPackage.identifier === item.identifier;
                const isAnnual = item.product.subscriptionPeriod === 'P1Y';
                const itemTrial = trialName(item);
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    disabled={Boolean(busyAction)}
                    key={item.identifier}
                    onPress={() => setSelectedPackage(item)}
                    style={[
                      styles.plan,
                      selected && styles.planSelected,
                    ]}
                  >
                    <View style={styles.planCopy}>
                      <Text style={styles.planName}>
                        {itemTrial ? 'Free' : periodName(item.product.subscriptionPeriod)}
                      </Text>
                      <Text style={styles.planPrice}>
                        {itemTrial ?? item.product.priceString}
                      </Text>
                    </View>
                    {isAnnual ? (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>
                          {itemTrial ? 'No Payment Now' : 'best value'}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.purchaseArea}>
              <Text style={styles.renewalCopy}>
                {selectedTrial
                  ? `Subscription renews at ${selectedPackage.product.priceString}/yr${selectedWeeklyEquivalent ? ` (${selectedWeeklyEquivalent} per week)` : ''}`
                  : `Subscription renews at ${selectedPackage.product.priceString}/${renewalUnit}${renewalUnit !== 'week' && selectedWeeklyEquivalent ? ` (${selectedWeeklyEquivalent} per week)` : ''}`}
              </Text>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={Boolean(busyAction)}
                onPress={purchase}
                style={styles.continueButton}
              >
                {busyAction === 'purchase' ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.continueText}>{selectedTrial ? 'Start free trial' : 'Continue'}</Text>
                    <ChevronRight color={colors.white} size={20} strokeWidth={3} />
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={Boolean(busyAction)}
                onPress={restore}
                style={styles.restoreButton}
              >
                {busyAction === 'restore' ? (
                  <ActivityIndicator color={colors.mink} size="small" />
                ) : (
                  <>
                    <RefreshCw color={colors.mink} size={12} strokeWidth={2.5} />
                    <Text style={styles.restoreText}>Restore purchases</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  benefitText: { color: colors.white, flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 20 },
  benefits: { gap: 9, marginTop: 12 },
  benefitsCompact: { gap: 7, marginTop: 9 },
  body: { flex: 1 },
  closeButton: {
    alignItems: 'center', backgroundColor: 'rgba(58,31,44,0.54)', borderRadius: 999,
    height: 38, justifyContent: 'center', position: 'absolute', right: 15, width: 38, zIndex: 2,
  },
  content: { flexGrow: 1, paddingLeft: 18, paddingRight: 15, paddingTop: 2 },
  contentCompact: { paddingTop: 0 },
  continueButton: {
    alignItems: 'center', backgroundColor: colors.cherry, borderRadius: 999, flexDirection: 'row',
    gap: 5, justifyContent: 'center', marginTop: 5, minHeight: 53,
    shadowColor: colors.cherry, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.22, shadowRadius: 12,
  },
  continueText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  error: { color: colors.cherry, fontSize: 12, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  hero: { backgroundColor: '#260017', height: '34%', minHeight: 244, overflow: 'hidden' },
  heroCompact: { minHeight: 210 },
  heroImage: { height: '112%', left: 0, position: 'absolute', top: '1%', width: '100%' },
  plan: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(58,31,44,0.11)',
    borderRadius: 14, borderWidth: 2, flexDirection: 'row', minHeight: 66, paddingHorizontal: 13, paddingVertical: 10,
  },
  planBadge: { backgroundColor: colors.raspberry, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  planBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  planCopy: { flex: 1 },
  planList: { gap: 7, marginTop: 13 },
  planListCompact: { marginTop: 10 },
  planName: { color: colors.cocoa, fontSize: 15, fontWeight: '900' },
  planPrice: { color: colors.mink, fontSize: 12, fontWeight: '700', marginTop: 1 },
  planSelected: { borderColor: colors.cherry, shadowColor: colors.cherry, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.16, shadowRadius: 7 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: -22 },
  purchaseArea: { marginTop: 5 },
  renewalCopy: { color: colors.cocoa, fontSize: 10, fontWeight: '700', opacity: 0.7, textAlign: 'center' },
  restoreButton: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 1, minHeight: 24 },
  restoreText: { color: colors.mink, fontSize: 10, fontWeight: '800' },
  screen: { backgroundColor: colors.raspberry, flex: 1 },
  socialProof: { bottom: -4, left: 0, position: 'absolute', right: 0 },
  stars: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', letterSpacing: -0.9, lineHeight: 33 },
  titleCompact: { fontSize: 28, lineHeight: 29 },
  wreathCopy: { color: colors.white, fontSize: 20, fontWeight: '900', lineHeight: 22, marginHorizontal: -2, minWidth: 144, textAlign: 'center' },
  wreathRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', transform: [{ translateY: -12 }] },
});
