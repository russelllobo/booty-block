import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, type SvgProps } from 'react-native-svg';

import { colors } from '../constants/theme';
import { Text } from './AppText';

export type GuideStep = 0 | 1 | 2;

type UnlockAppsGuideProps = {
  initialStep?: GuideStep;
  onFinish: () => void;
  visible: boolean;
};

const APP_ICONS = [
  { label: 'Instagram', source: require('../assets/onboarding/app-icons/instagram.png') },
  { label: 'TikTok', source: require('../assets/onboarding/app-icons/tiktok.png') },
  { label: 'YouTube', source: require('../assets/onboarding/app-icons/youtube.png') },
  { label: 'Snapchat', source: require('../assets/onboarding/app-icons/snapchat.png') },
] as const;

const STEP_COPY = [
  {
    heading: 'open a blocked app',
    support: 'open your app like you normally would',
    button: 'next step',
  },
  {
    heading: "tap “let’s squat 🍑”",
    support: 'bootyblock will send you an unlock notification',
    button: 'next step',
  },
  {
    heading: 'open the notification',
    support: 'and start squatting! 🍑',
    button: 'got it 🍑',
  },
] as const;

function OpaquePointer({ size, style }: { size: number; style?: SvgProps['style'] }) {
  return (
    <Svg height={size} style={style} viewBox="0 0 40 40" width={size}>
      <Path
        d="M15 3c-1.7 0-3 1.3-3 3v14l-3-3c-1.4-1.4-3.6-1.4-5 0s-1.4 3.6 0 5l8.5 9c1.9 2 4.5 3 7.3 3H25c6.1 0 11-4.9 11-11v-8c0-1.7-1.3-3-3-3s-3 1.3-3 3v-1c0-1.7-1.3-3-3-3s-3 1.3-3 3v-3c0-1.7-1.3-3-3-3s-3 1.3-3 3V6c0-1.7-1.3-3-3-3Z"
        fill="#FFFFFF"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
      />
      <Path
        d="M18 11v8M24 14v5M30 15v5"
        fill="none"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function AppGrid() {
  return (
    <View style={styles.appGrid}>
      {APP_ICONS.map((app) => (
        <View key={app.label} style={styles.appItem}>
          <Image accessibilityIgnoresInvertColors source={app.source} style={styles.appIcon} />
          <Text numberOfLines={1} style={styles.appLabel}>{app.label}</Text>
        </View>
      ))}
      <OpaquePointer size={34} style={styles.appPointer} />
    </View>
  );
}

function ShieldPreview() {
  return (
    <View style={styles.shieldPreview}>
      <View style={styles.shieldButton}>
        <Text style={styles.shieldButtonText}>Let&apos;s squat 🍑</Text>
      </View>
      <OpaquePointer size={36} style={styles.shieldPointer} />
    </View>
  );
}

function NotificationPreview() {
  return (
    <View style={styles.notificationStage}>
      <View style={styles.notification}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={require('../assets/logo.png')}
          style={styles.notificationLogo}
        />
        <View style={styles.notificationCopy}>
          <View style={styles.notificationMetaRow}>
            <Text style={styles.notificationApp}>BOOTYBLOCK</Text>
            <Text style={styles.notificationTime}>now</Text>
          </View>
          <Text style={styles.notificationTitle}>Your apps are blocked!</Text>
          <Text style={styles.notificationBody}>Tap to squat and unlock them.</Text>
        </View>
      </View>
      <OpaquePointer size={38} style={styles.notificationPointer} />
    </View>
  );
}

export function UnlockAppsGuide({ initialStep = 0, onFinish, visible }: UnlockAppsGuideProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<GuideStep>(initialStep);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setStep(initialStep);
      entrance.setValue(0);
      return;
    }

    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, initialStep, step, visible]);

  function close() {
    void Haptics.selectionAsync().catch(() => {});
    onFinish();
  }

  function advance() {
    void Haptics.selectionAsync().catch(() => {});
    if (step === 2) {
      onFinish();
      return;
    }
    setStep((step + 1) as GuideStep);
  }

  const copy = STEP_COPY[step];
  const guideHeight = Math.min(500, windowHeight - insets.top - insets.bottom - 28);

  return (
    <Modal
      accessibilityViewIsModal
      animationType="none"
      onRequestClose={close}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View pointerEvents="none" style={styles.dim} />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: guideHeight,
              opacity: entrance,
              transform: [{
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text maxFontSizeMultiplier={1.1} style={styles.title}>how to unlock your apps 🍑</Text>
            <Pressable
              accessibilityLabel="Close unlock guide"
              accessibilityRole="button"
              hitSlop={10}
              onPress={close}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <X color={colors.cocoa} size={19} strokeWidth={3} />
            </Pressable>
          </View>

          <View accessibilityLabel={`Step ${step + 1} of 3`} style={styles.steps}>
            {([0, 1, 2] as const).map((item) => (
              <View key={item} style={[styles.stepCircle, item === step && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, item === step && styles.stepNumberActive]}>{item + 1}</Text>
              </View>
            ))}
          </View>

          <Text maxFontSizeMultiplier={1.1} style={styles.heading}>{copy.heading}</Text>

          <View style={styles.illustration}>
            {step === 0 ? <AppGrid /> : step === 1 ? <ShieldPreview /> : <NotificationPreview />}
          </View>

          <Text maxFontSizeMultiplier={1.1} style={styles.support}>{copy.support}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={advance}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>{copy.button}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 24, 27, 0.72)',
  },
  sheet: {
    backgroundColor: '#FFFDFC',
    borderColor: colors.cocoa,
    borderRadius: 24,
    borderWidth: 2,
    maxWidth: 430,
    overflow: 'hidden',
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
    shadowColor: '#1E1319',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 4,
  },
  title: {
    color: colors.cocoa,
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.cocoa,
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pressed: { opacity: 0.72 },
  steps: {
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 8,
  },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.cocoa,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stepCircleActive: { backgroundColor: '#F57C2D' },
  stepNumber: { color: colors.cocoa, fontSize: 12, fontWeight: '900' },
  stepNumberActive: { color: colors.white },
  heading: {
    color: colors.cocoa,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  illustration: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 8,
    minHeight: 145,
  },
  appGrid: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#F0649B',
    borderRadius: 19,
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 150,
    paddingHorizontal: 10,
    position: 'relative',
  },
  appItem: { alignItems: 'center', width: '24%' },
  appIcon: { borderRadius: 13, height: 52, width: 52 },
  appLabel: { color: colors.white, fontSize: 9, fontWeight: '800', marginTop: 7 },
  appPointer: { bottom: 25, left: '34%', position: 'absolute', transform: [{ rotate: '-10deg' }] },
  shieldPreview: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFF1F6',
    borderRadius: 19,
    height: 155,
    justifyContent: 'flex-end',
    padding: 14,
    position: 'relative',
    shadowColor: '#1E1319',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.11,
    shadowRadius: 12,
  },
  shieldButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.raspberry,
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
  },
  shieldButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  shieldPointer: { bottom: -10, left: '54%', position: 'absolute', transform: [{ rotate: '-8deg' }] },
  notificationStage: {
    alignSelf: 'stretch',
    backgroundColor: '#F5F2F3',
    borderRadius: 19,
    justifyContent: 'flex-start',
    height: 155,
    padding: 12,
    position: 'relative',
  },
  notification: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 17,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#1E1319',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  notificationLogo: { borderRadius: 7, height: 28, width: 28 },
  notificationCopy: { flex: 1, marginLeft: 8 },
  notificationMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  notificationApp: { color: colors.mink, fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  notificationTime: { color: colors.mink, fontSize: 9, fontWeight: '700' },
  notificationTitle: { color: colors.cocoa, fontSize: 13, fontWeight: '900', marginTop: 3 },
  notificationBody: { color: colors.mink, fontSize: 11, fontWeight: '700', marginTop: 1 },
  notificationPointer: { left: '47%', position: 'absolute', top: 62, transform: [{ rotate: '-8deg' }] },
  support: {
    color: colors.mink,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 18,
    textAlign: 'center',
  },
  cta: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  ctaPressed: { opacity: 0.84, transform: [{ scale: 0.995 }] },
  ctaText: { color: colors.white, fontSize: 15, fontWeight: '900' },
});
