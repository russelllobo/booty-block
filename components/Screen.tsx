import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Background = 'light' | string;

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  flush?: boolean;
  backgroundColor?: string;
  backgroundGradient?: LinearGradientProps['colors'];
}>;

let lastBackground: Background = 'light';

function BackgroundLayer({
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
}

export function Screen({
  children,
  scroll = true,
  flush = false,
  backgroundColor,
  backgroundGradient,
}: ScreenProps) {
  const background: Background = backgroundColor ?? 'light';
  const previousBackground = useRef(lastBackground).current;
  const previousOpacity = useRef(new Animated.Value(previousBackground === background ? 0 : 1)).current;

  useEffect(() => {
    lastBackground = background;
    previousOpacity.setValue(previousBackground === background ? 0 : 1);
    Animated.timing(previousOpacity, {
      toValue: 0,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [background, previousBackground, previousOpacity]);

  const content = (
    <SafeAreaView className="flex-1" style={{ flex: 1 }}>
      <View className={flush ? 'flex-1' : 'flex-1 px-6 pb-6 pt-3'}>{children}</View>
    </SafeAreaView>
  );

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <BackgroundLayer background={background} gradient={backgroundGradient} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: previousOpacity }]}
      >
        <BackgroundLayer background={previousBackground} />
      </Animated.View>
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
