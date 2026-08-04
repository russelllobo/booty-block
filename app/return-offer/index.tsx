import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Dumbbell, LockKeyhole, Sparkles } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PeachPatch3D } from '../../components/PeachPatch3D';
import { Screen } from '../../components/Screen';
import { colors, onboardingLightBackground, onboardingLightGradient } from '../../constants/theme';
import { getPeachPatchStage } from '../../lib/peachPatch';
import { countSquatActivityDays } from '../../lib/squatActivity';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

function Reveal({ children, delay }: { children: ReactNode; delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        duration: 480,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{
          translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
        }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function BenefitRow({
  icon: Icon,
  label,
}: {
  icon: typeof LockKeyhole;
  label: string;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon color={colors.raspberry} size={20} strokeWidth={2.7} />
      </View>
      <Text style={styles.benefitLabel}>{label}</Text>
    </View>
  );
}

export default function ReturnOfferIntro() {
  const { height } = useWindowDimensions();
  const { profileName, unlockHistory } = useBootyblock();
  const compact = height < 720;
  const completedDays = useMemo(
    () => countSquatActivityDays(unlockHistory),
    [unlockHistory],
  );
  const patchStage = useMemo(() => getPeachPatchStage(completedDays), [completedDays]);
  const displayName = profileName.trim()
    || (Platform.OS === 'web' && __DEV__ ? 'russell' : '');

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <StatusBar style="dark" animated />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Reveal delay={0}>
          {displayName ? <Text style={styles.name}>{displayName.toLowerCase()}</Text> : null}
          <Text style={[styles.headline, compact && styles.headlineCompact]}>
            in 30 days, you’ll have a booty habit that sticks.
          </Text>
        </Reveal>

        <Reveal delay={120}>
          <View style={[styles.patchFrame, compact && styles.patchFrameCompact]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <PeachPatch3D active completedDays={completedDays} interactive={false} />
            </View>
            <LinearGradient
              colors={['rgba(28,70,102,0.10)', 'rgba(22,55,82,0.72)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.patchCopy}>
              <Text style={styles.patchEyebrow}>
                day {completedDays} · {patchStage.title}
              </Text>
              <Text style={styles.patchTitle}>your peach patch</Text>
              <Text style={styles.patchSubtitle}>
                {patchStage.farmers} farmers · {patchStage.peachTrees} peach trees
              </Text>
            </View>
          </View>
          <Text style={styles.explainer}>
            this is your peach patch. it starts with one squat, then grows every time you choose your body over the scroll.
          </Text>
        </Reveal>

        <Reveal delay={240}>
          <View style={styles.benefits}>
            <BenefitRow icon={LockKeyhole} label="block your apps until you squat" />
            <BenefitRow icon={Dumbbell} label="build your glutes in scroll-sized sets" />
            <BenefitRow icon={Sparkles} label="grow your peach patch one rep at a time" />
          </View>
        </Reveal>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="continue" onPress={() => router.push('/return-offer/reviews')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  benefitIcon: {
    alignItems: 'center', backgroundColor: colors.blush, borderRadius: 12, height: 38,
    justifyContent: 'center', width: 38,
  },
  benefitLabel: { color: colors.cocoa, flex: 1, fontSize: 14, fontWeight: '900', lineHeight: 18 },
  benefitRow: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.76)', borderColor: colors.cocoa,
    borderRadius: 16, borderWidth: 2, flexDirection: 'row', gap: 11, minHeight: 58,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  benefits: { gap: 9, marginTop: 3 },
  content: { paddingBottom: 16, paddingTop: 8 },
  explainer: { color: colors.mink, fontSize: 11, fontWeight: '700', lineHeight: 15, paddingHorizontal: 8, paddingVertical: 9 },
  footer: { backgroundColor: 'rgba(255,249,243,0.78)', borderTopColor: 'rgba(58,31,44,0.10)', borderTopWidth: 1, paddingTop: 10 },
  headline: { color: colors.cocoa, fontSize: 30, fontWeight: '900', letterSpacing: -1.1, lineHeight: 33, marginTop: 2, paddingHorizontal: 8, textAlign: 'center' },
  headlineCompact: { fontSize: 27, lineHeight: 30 },
  name: { color: colors.raspberry, fontSize: 18, fontWeight: '900', lineHeight: 23, textAlign: 'center' },
  patchCopy: { bottom: 0, left: 0, padding: 20, position: 'absolute', right: 0 },
  patchEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  patchFrame: { backgroundColor: '#7DB8E8', borderRadius: 30, height: 320, marginTop: 18, overflow: 'hidden' },
  patchFrameCompact: { height: 286 },
  patchSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  patchTitle: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 3 },
});
