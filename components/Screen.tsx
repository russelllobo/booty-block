import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { memo, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Background = 'light' | string;

type BackgroundState = {
  background: Background;
  gradient?: LinearGradientProps['colors'];
};

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  flush?: boolean;
  backgroundColor?: string;
  backgroundGradient?: LinearGradientProps['colors'];
}>;

let lastBackgroundState: BackgroundState = { background: 'light' };

function backgroundKey({ background, gradient }: BackgroundState) {
  return `${background}:${gradient?.join(',') ?? ''}`;
}

const BackgroundLayer = memo(function BackgroundLayer({
  background,
  gradient,
}: {
  background: Background;
  gradient?: LinearGradientProps['colors'];
}) {
  const colors: LinearGradientProps['colors'] =
    background === 'light'
      ? ['#FFF1F6', '#FFF9F3', '#FFD6E7']
      : gradient ?? [background, background];

  return (
    <LinearGradient
      colors={colors}
      className="flex-1"
      style={StyleSheet.absoluteFill}
    />
  );
});

export function Screen({
  children,
  scroll = true,
  flush = false,
  backgroundColor,
  backgroundGradient,
}: ScreenProps) {
  const background: Background = backgroundColor ?? 'light';
  const requestedBackground = { background, gradient: backgroundGradient };
  const requestedBackgroundKey = backgroundKey(requestedBackground);
  const initialPreviousBackground = useRef(
    backgroundKey(lastBackgroundState) === requestedBackgroundKey ? null : lastBackgroundState,
  ).current;
  const [currentBackground, setCurrentBackground] = useState<BackgroundState>(requestedBackground);
  const [previousBackground, setPreviousBackground] = useState<BackgroundState | null>(
    initialPreviousBackground,
  );
  const currentBackgroundRef = useRef(requestedBackground);
  const mountedRef = useRef(false);
  const previousOpacity = useRef(new Animated.Value(initialPreviousBackground ? 1 : 0)).current;

  useEffect(() => {
    const previous = mountedRef.current ? currentBackgroundRef.current : initialPreviousBackground;

    if (mountedRef.current) {
      setPreviousBackground(previous);
      setCurrentBackground(requestedBackground);
      previousOpacity.setValue(1);
    }

    mountedRef.current = true;
    currentBackgroundRef.current = requestedBackground;
    lastBackgroundState = requestedBackground;

    if (!previous) {
      previousOpacity.setValue(0);
      return;
    }

    const animation = Animated.timing(previousOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setPreviousBackground(null);
    });

    return () => animation.stop();
  }, [initialPreviousBackground, previousOpacity, requestedBackgroundKey]);

  const content = (
    <SafeAreaView className="flex-1" style={{ flex: 1 }}>
      <View className={flush ? 'flex-1' : 'flex-1 px-6 pb-6 pt-3'}>{children}</View>
    </SafeAreaView>
  );

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <BackgroundLayer
        background={currentBackground.background}
        gradient={currentBackground.gradient}
      />
      {previousBackground ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: previousOpacity }]}
        >
          <BackgroundLayer
            background={previousBackground.background}
            gradient={previousBackground.gradient}
          />
        </Animated.View>
      ) : null}
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}
