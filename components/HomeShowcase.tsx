import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type View as ViewType,
} from 'react-native';
import { Text } from './AppText';

import { colors } from '../constants/theme';

export type HomeShowcaseStep = 'patch' | 'journey' | 'blocking';

type SpotlightRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type HomeShowcaseProps = {
  onAdvance: (step: HomeShowcaseStep) => void;
  onChooseApps: () => void;
  step: HomeShowcaseStep | null;
  targetRef: RefObject<ViewType | null>;
};

const COPY: Record<HomeShowcaseStep, { body: string; button: string; title: string }> = {
  patch: {
    title: 'meet your peach patch 🍑',
    body: 'every squat grows your little patch. build your streak to add peach trees, farmers, and plenty more.',
    button: 'got it',
  },
  journey: {
    title: 'your 90 day journey 💪',
    body: 'every day you squat gets checked off here. watch your streak, booty XP, and peach progress grow together.',
    button: 'got it',
  },
  blocking: {
    title: 'block the distractions 🔒',
    body: 'pick the apps that pull you away. bootyblock keeps them locked until you earn your scroll with squats.',
    button: 'choose apps to block',
  },
};

const SPOTLIGHT_GUTTER = 6;
const CARD_HEIGHT = 205;

export function HomeShowcase({ onAdvance, onChooseApps, step, targetRef }: HomeShowcaseProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!step) {
      setSpotlight(null);
      entrance.setValue(0);
      return;
    }

    let cancelled = false;
    let frame: number | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const measure = () => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        setSpotlight({
          x: Math.max(0, x - SPOTLIGHT_GUTTER),
          y: Math.max(0, y - SPOTLIGHT_GUTTER),
          width: Math.min(windowWidth, width + SPOTLIGHT_GUTTER * 2),
          height: Math.min(windowHeight, height + SPOTLIGHT_GUTTER * 2),
        });
      });
    };

    if (step === 'blocking') {
      setSpotlight(null);
    } else {
      frame = requestAnimationFrame(measure);
      retry = setTimeout(measure, 280);
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => {
      cancelled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (retry !== null) clearTimeout(retry);
      animation.stop();
    };
  }, [entrance, step, targetRef, windowHeight, windowWidth]);

  const centered = step === 'blocking';
  if (!step || (!centered && !spotlight)) return null;

  const currentStep = step;
  const copy = COPY[currentStep];
  const roomBelow = spotlight ? windowHeight - (spotlight.y + spotlight.height) : 0;
  const cardTop = spotlight
    ? roomBelow >= CARD_HEIGHT + 18
      ? spotlight.y + spotlight.height + 12
      : Math.max(18, spotlight.y - CARD_HEIGHT - 12)
    : 0;
  const spotlightBottom = spotlight
    ? Math.min(windowHeight, spotlight.y + spotlight.height)
    : 0;
  const spotlightRight = spotlight
    ? Math.min(windowWidth, spotlight.x + spotlight.width)
    : 0;
  const dimColor = 'rgba(28, 24, 27, 0.68)';
  const entranceTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  function continueShowcase() {
    void Haptics.selectionAsync().catch(() => {});
    if (currentStep === 'blocking') {
      onChooseApps();
      return;
    }
    onAdvance(currentStep);
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType="none"
      onRequestClose={() => {}}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.overlay}>
        {centered ? (
          <View pointerEvents="none" style={[styles.fullDim, { backgroundColor: dimColor }]} />
        ) : spotlight ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.dim, {
                backgroundColor: dimColor,
                height: spotlight.y,
                left: 0,
                top: 0,
                width: windowWidth,
              }]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, {
                backgroundColor: dimColor,
                height: spotlight.height,
                left: 0,
                top: spotlight.y,
                width: spotlight.x,
              }]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, {
                backgroundColor: dimColor,
                height: spotlight.height,
                left: spotlightRight,
                right: 0,
                top: spotlight.y,
              }]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, {
                backgroundColor: dimColor,
                bottom: 0,
                left: 0,
                top: spotlightBottom,
                width: windowWidth,
              }]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.spotlightBorder,
                {
                  height: spotlight.height,
                  left: spotlight.x,
                  top: spotlight.y,
                  width: spotlight.width,
                },
              ]}
            />
          </>
        ) : null}

        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.card,
            centered ? styles.centeredCard : { top: cardTop },
            {
              opacity: entrance,
              transform: centered
                ? [{ translateY: -CARD_HEIGHT / 2 }, { translateY: entranceTranslateY }]
                : [{ translateY: entranceTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.button}
            onPress={continueShowcase}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{copy.button}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  fullDim: {
    ...StyleSheet.absoluteFill,
  },
  spotlightBorder: {
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 30,
    borderWidth: 2,
    position: 'absolute',
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  card: {
    backgroundColor: '#FFFDFC',
    borderColor: colors.cocoa,
    borderRadius: 24,
    borderWidth: 2,
    left: 14,
    minHeight: CARD_HEIGHT,
    padding: 15,
    position: 'absolute',
    right: 14,
    shadowColor: '#1E1319',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 18,
  },
  centeredCard: {
    top: '50%',
  },
  title: {
    color: colors.cocoa,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    textAlign: 'center',
  },
  body: {
    color: colors.mink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginHorizontal: 5,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 2 }],
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
