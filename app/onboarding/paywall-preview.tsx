import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Check, Heart, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '../../components/AppText';
import { colors, onboardingLightGradient } from '../../constants/theme';

const paywallArt = require('../../assets/paywall-apps.png');

export default function PaywallPreview() {
  const { offer } = useLocalSearchParams<{ offer?: string }>();
  const discounted = offer === 'discount';

  return (
    <LinearGradient
      colors={onboardingLightGradient}
      style={styles.screen}
    >
      <View style={styles.close}>
        <X size={22} stroke={colors.cocoa} strokeWidth={2.5} />
      </View>

      <Image source={paywallArt} resizeMode="contain" style={styles.art} />

      <View style={styles.copy}>
        <View style={styles.eyebrow}>
          {discounted ? (
            <Sparkles size={17} stroke="#FFD76A" strokeWidth={2.5} />
          ) : (
            <Heart size={17} stroke={colors.raspberry} fill={colors.raspberry} strokeWidth={2.5} />
          )}
          <Text style={styles.eyebrowText}>
            {discounted ? 'ONE-TIME OFFER' : 'BOOTYBLOCK PRO'}
          </Text>
        </View>

        <Text style={styles.title}>
          {discounted ? 'Keep the plan. Pay less.' : 'Build the booty. Beat the scroll.'}
        </Text>

        <View style={styles.features}>
          {[
            'Block distracting apps',
            'Earn scrolling with squats',
            'Build a routine that sticks',
          ].map((feature) => (
            <View key={feature} style={styles.feature}>
              <View style={styles.check}>
                <Check size={16} stroke={colors.white} strokeWidth={3.2} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.plan}>
          <ShieldCheck size={24} stroke={colors.raspberry} strokeWidth={2.4} />
          <View style={styles.planCopy}>
            <Text style={styles.planTitle}>
              {discounted ? 'Special annual plan' : 'Annual access'}
            </Text>
            <Text style={styles.planPrice}>
              {discounted ? 'Save 50% today' : '7-day free trial'}
            </Text>
          </View>
        </View>
        <View style={[styles.button, discounted && styles.goldButton]}>
          <Text style={[styles.buttonText, discounted && styles.darkButtonText]}>
            {discounted ? 'Claim my offer' : 'Start my free trial'}
          </Text>
        </View>
        <Text style={styles.terms}>
          Cancel anytime · Restore purchases
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  art: {
    alignSelf: 'center',
    height: '31%',
    marginTop: 24,
    width: '88%',
  },
  bottom: {
    gap: 13,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 58,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  check: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderRadius: 999,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  close: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
    width: 42,
    zIndex: 2,
  },
  copy: {
    flex: 1,
    paddingHorizontal: 25,
  },
  darkButtonText: {
    color: '#24120A',
  },
  eyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  eyebrowText: {
    color: colors.raspberry,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  feature: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  featureText: {
    color: colors.cocoa,
    fontSize: 16,
    fontWeight: '800',
  },
  features: {
    gap: 13,
    marginTop: 22,
  },
  goldButton: {
    backgroundColor: '#FFD76A',
  },
  plan: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(122,33,73,0.14)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  planCopy: {
    flex: 1,
    marginLeft: 12,
  },
  planPrice: {
    color: colors.mink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  planTitle: {
    color: colors.cocoa,
    fontSize: 16,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
    minHeight: '100%',
    paddingTop: 34,
  },
  terms: {
    color: colors.mink,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: colors.cocoa,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: 12,
    textAlign: 'center',
  },
});
