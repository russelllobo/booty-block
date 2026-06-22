import { useMemo } from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';

type Star = {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  opacity: number;
};

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

type StarsBackgroundProps = {
  count?: number;
  seed?: number;
};

export function StarsBackground({ count = 80, seed = 42 }: StarsBackgroundProps) {
  const stars = useMemo<Star[]>(() => {
    const random = seededRandom(seed);
    return Array.from({ length: count }, () => {
      const roll = random();
      const size = roll < 0.82 ? 1 : roll < 0.96 ? 1.5 : 2;
      return {
        top: `${random() * 100}%` as DimensionValue,
        left: `${random() * 100}%` as DimensionValue,
        size,
        opacity: 0.35 + random() * 0.5,
      };
    });
  }, [count, seed]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#ffffff',
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}
