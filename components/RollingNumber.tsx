import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Text } from './AppText';
import {
  digitForPosition,
  nextRollingDigitPosition,
  RollDirection,
} from './rollingNumberMath';

type Token = { kind: 'digit'; value: number } | { kind: 'char'; value: string };

function tokenize(input: string): Token[] {
  return Array.from(input).map((ch) => {
    if (ch >= '0' && ch <= '9') return { kind: 'digit', value: Number(ch) };
    return { kind: 'char', value: ch };
  });
}

const SPRING = {
  damping: 18,
  stiffness: 320,
  mass: 0.55,
};

const SMOOTH = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

type RollingDigitProps = {
  value: number;
  color: string;
  fontSize: number;
  fontWeight: '900' | '800' | '700' | '600';
  letterSpacing?: number;
  smooth?: boolean;
  direction: RollDirection;
};

const DIGIT_WINDOW_RADIUS = 12;

function RollingDigit({
  value,
  color,
  fontSize,
  fontWeight,
  letterSpacing,
  smooth,
  direction,
}: RollingDigitProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [windowCenter, setWindowCenter] = useState(value);
  const translateY = useSharedValue(0);
  const mountedRef = useRef(false);
  const positionRef = useRef(value);

  useEffect(() => {
    if (!size) return;
    const nextPosition = nextRollingDigitPosition(positionRef.current, value, direction);
    const target = -nextPosition * size.h;
    if (!mountedRef.current) {
      mountedRef.current = true;
      translateY.value = target;
      positionRef.current = nextPosition;
      setWindowCenter(nextPosition);
      return;
    }
    positionRef.current = nextPosition;
    setWindowCenter(nextPosition);
    translateY.value = smooth ? withTiming(target, SMOOTH) : withSpring(target, SPRING);
  }, [value, size, translateY, smooth, direction]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!size) {
    return (
      <Text
        onLayout={(event) => {
          setSize({
            w: event.nativeEvent.layout.width,
            h: event.nativeEvent.layout.height,
          });
        }}
        style={{
          fontSize,
          fontWeight,
          color: 'transparent',
          fontVariant: ['tabular-nums'],
          letterSpacing,
          includeFontPadding: false,
        }}
      >
        0
      </Text>
    );
  }

  return (
    <View style={{ width: size.w, height: size.h, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { marginTop: (windowCenter - DIGIT_WINDOW_RADIUS) * size.h },
          animatedStyle,
        ]}
      >
        {Array.from({ length: DIGIT_WINDOW_RADIUS * 2 + 1 }, (_, index) => {
          const position = windowCenter - DIGIT_WINDOW_RADIUS + index;
          const digit = digitForPosition(position);

          return (
            <View
              key={position}
              style={{
                width: size.w,
                height: size.h,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize,
                  fontWeight,
                  color,
                  fontVariant: ['tabular-nums'],
                  letterSpacing,
                  includeFontPadding: false,
                }}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

type RollingNumberProps = {
  value: string;
  color: string;
  fontSize: number;
  fontWeight?: '900' | '800' | '700' | '600';
  letterSpacing?: number;
  smooth?: boolean;
  direction?: RollDirection;
};

export function RollingNumber({
  value,
  color,
  fontSize,
  fontWeight = '900',
  letterSpacing = 0,
  smooth = false,
  direction = 'up',
}: RollingNumberProps) {
  const tokens = tokenize(value);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {tokens.map((token, index) =>
        token.kind === 'digit' ? (
          <RollingDigit
            key={index}
            value={token.value}
            color={color}
            fontSize={fontSize}
            fontWeight={fontWeight}
            letterSpacing={letterSpacing}
            smooth={smooth}
            direction={direction}
          />
        ) : (
          <Text
            key={index}
            style={{
              fontSize,
              fontWeight,
              color,
              fontVariant: ['tabular-nums'],
              letterSpacing,
              includeFontPadding: false,
            }}
          >
            {token.value}
          </Text>
        ),
      )}
    </View>
  );
}
