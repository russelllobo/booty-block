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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from './AppText';

import { colors } from '../constants/theme';

export type HomeShowcaseStep = 'patch' | 'journey' | 'blocking' | 'timings' | 'support';

type SpotlightRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type HomeShowcaseProps = {
  onAdvance: (step: HomeShowcaseStep) => void;
  onChooseApps?: () => void;
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
  timings: {
    title: 'your booty lock 🔒',
    body: 'choose the times your apps lock each day. tap any time to change it, or switch a booty lock off whenever you need to.',
    button: 'got it',
  },
  support: {
    title: "we're here for you 💌",
    body: 'have an idea, a question, or something not working quite right? send us feedback straight from settings.',
    button: 'got it',
  },
};

const SPOTLIGHT_RADIUS = 24;
const CARD_EDGE_GAP = 18;

function roundedSpotlightPath(
  windowWidth: number,
  windowHeight: number,
  spotlight: SpotlightRect,
) {
  const { height, width, x, y } = spotlight;
  const radius = Math.min(SPOTLIGHT_RADIUS, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;

  return [
    `M 0 0 H ${windowWidth} V ${windowHeight} H 0 Z`,
    `M ${x + radius} ${y}`,
    `H ${right - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${y + radius}`,
    `V ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `H ${x + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x} ${bottom - radius}`,
    `V ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    'Z',
  ].join(' ');
}

export function HomeShowcase({ onAdvance, onChooseApps, step, targetRef }: HomeShowcaseProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.min(windowWidth - Math.max(0, x), width),
          height: Math.min(windowHeight - Math.max(0, y), height),
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
  const placeCardAtTop = step === 'timings' || step === 'support';
  if (!step || (!centered && !spotlight)) return null;

  const currentStep = step;
  const copy = COPY[currentStep];
  const dimColor = 'rgba(28, 24, 27, 0.68)';
  const entranceTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  function continueShowcase() {
    void Haptics.selectionAsync().catch(() => {});
    if (currentStep === 'blocking') {
      onChooseApps?.();
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
          <Svg
            height={windowHeight}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width={windowWidth}
          >
            <Path
              d={roundedSpotlightPath(windowWidth, windowHeight, spotlight)}
              fill={dimColor}
              fillRule="evenodd"
            />
            <Rect
              fill="transparent"
              height={Math.max(0, spotlight.height - 2)}
              rx={Math.max(0, SPOTLIGHT_RADIUS - 1)}
              ry={Math.max(0, SPOTLIGHT_RADIUS - 1)}
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth={2}
              width={Math.max(0, spotlight.width - 2)}
              x={spotlight.x + 1}
              y={spotlight.y + 1}
            />
          </Svg>
        ) : null}

        <View
          pointerEvents="box-none"
          style={[
            styles.cardLayer,
            centered
              ? styles.centeredCardLayer
              : placeCardAtTop
                ? styles.topCardLayer
                : styles.bottomCardLayer,
            {
              paddingBottom: Math.max(CARD_EDGE_GAP, insets.bottom + CARD_EDGE_GAP),
              paddingTop: Math.max(CARD_EDGE_GAP, insets.top + CARD_EDGE_GAP),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.cardSurface,
              {
                opacity: entrance,
                transform: [{ translateY: entranceTranslateY }],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.title}. ${copy.body}. ${copy.button}`}
              onPress={continueShowcase}
              style={({ pressed }) => [styles.cardContent, pressed && styles.cardPressed]}
            >
              <Text maxFontSizeMultiplier={1.15} style={styles.title}>{copy.title}</Text>
              <Text maxFontSizeMultiplier={1.15} style={styles.body}>{copy.body}</Text>
              <View style={styles.button}>
                <Text maxFontSizeMultiplier={1.15} style={styles.buttonText}>{copy.button}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  fullDim: {
    ...StyleSheet.absoluteFill,
  },
  cardLayer: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: CARD_EDGE_GAP,
  },
  bottomCardLayer: {
    justifyContent: 'flex-end',
  },
  topCardLayer: {
    justifyContent: 'flex-start',
  },
  centeredCardLayer: {
    justifyContent: 'center',
  },
  cardSurface: {
    backgroundColor: '#FFFDFC',
    borderColor: colors.cocoa,
    borderRadius: 24,
    borderWidth: 2,
    shadowColor: '#1E1319',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 18,
  },
  cardContent: {
    backgroundColor: '#FFFDFC',
    borderRadius: 22,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
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
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
