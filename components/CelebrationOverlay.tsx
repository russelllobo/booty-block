import { CheckCircle2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';

type Particle = {
  color: string;
  angle: number;
  velocity: number;
  spin: number;
  size: number;
  drift: number;
};

const CONFETTI_COLORS = [
  colors.raspberry,
  colors.lime,
  colors.bubble,
  colors.mint,
  colors.cream,
  colors.white,
];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4,
    velocity: 0.55 + Math.random() * 0.7,
    spin: (Math.random() - 0.5) * 720,
    size: 9 + Math.random() * 9,
    drift: (Math.random() - 0.5) * 140,
  }));
}

type CelebrationOverlayProps = {
  visible: boolean;
};

export function CelebrationOverlay({ visible }: CelebrationOverlayProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelTranslateY = useRef(new Animated.Value(14)).current;
  const particles = useMemo(() => makeParticles(34), []);

  useEffect(() => {
    if (!visible) return;

    progress.setValue(0);
    ringScale.setValue(0);
    ringOpacity.setValue(0.95);
    checkScale.setValue(0);
    labelOpacity.setValue(0);
    labelTranslateY.setValue(14);

    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(ringScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(labelOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(labelTranslateY, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animation.start();

    return () => {
      animation.stop();
      progress.stopAnimation();
      ringScale.stopAnimation();
      ringOpacity.stopAnimation();
      checkScale.stopAnimation();
      labelOpacity.stopAnimation();
      labelTranslateY.stopAnimation();
    };
  }, [visible, progress, ringScale, ringOpacity, checkScale, labelOpacity, labelTranslateY]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.anchor}>
        {particles.map((particle, index) => {
          const distance = 230 * particle.velocity;
          const dx = Math.cos(particle.angle) * distance + particle.drift;
          const dy = Math.sin(particle.angle) * distance;
          const gravityDrop = 280 * particle.velocity;

          const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, dx],
          });
          const translateY = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, dy * 0.5 + gravityDrop * 0.25, dy + gravityDrop],
          });
          const rotate = progress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${particle.spin}deg`],
          });
          const opacity = progress.interpolate({
            inputRange: [0, 0.08, 0.78, 1],
            outputRange: [0, 1, 1, 0],
          });
          const scale = progress.interpolate({
            inputRange: [0, 0.14],
            outputRange: [0.3, 1],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  backgroundColor: particle.color,
                  width: particle.size,
                  height: particle.size * 0.5,
                  opacity,
                  transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                },
              ]}
            />
          );
        })}

        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.checkBadge,
            {
              transform: [{ scale: checkScale }],
            },
          ]}
        >
          <CheckCircle2 size={76} stroke={colors.cocoa} strokeWidth={3} />
        </Animated.View>

        <Animated.View
          style={[
            styles.label,
            {
              opacity: labelOpacity,
              transform: [{ translateY: labelTranslateY }],
            },
          ]}
        >
          <Text style={styles.labelText}>BANKED</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
  },
  confetti: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 2,
  },
  ring: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: colors.mint,
    backgroundColor: 'rgba(191, 247, 211, 0.22)',
    marginLeft: -120,
    marginTop: -120,
  },
  checkBadge: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -59,
    marginTop: -59,
  },
  label: {
    position: 'absolute',
    top: 86,
    left: 0,
    marginLeft: -100,
    width: 200,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.cocoa,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
