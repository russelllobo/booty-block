import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  flush?: boolean;
}>;

export function Screen({ children, scroll = true, flush = false }: ScreenProps) {
  const content = (
    <SafeAreaView className="flex-1" style={{ flex: 1 }}>
      <View className={flush ? 'flex-1' : 'flex-1 px-6 pb-6 pt-3'}>{children}</View>
    </SafeAreaView>
  );

  return (
    <LinearGradient
      colors={['#FFF1F6', '#FFF9F3', '#FFD6E7']}
      className="flex-1"
      style={{ flex: 1 }}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </LinearGradient>
  );
}
