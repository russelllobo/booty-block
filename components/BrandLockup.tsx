import { Image, View } from 'react-native';
import { Text } from './AppText';

type BrandLockupProps = {
  height?: number;
  label?: string;
  textColor?: string;
  textTranslateY?: number;
  textVariant?: 'brand' | 'quiet';
};

const logo = require('../assets/logo-small.png');
const aspectRatio = 695 / 1024;

export function BrandLockup({
  height = 46,
  label,
  textColor,
  textTranslateY,
  textVariant = 'brand',
}: BrandLockupProps) {
  const quietText = textVariant === 'quiet';
  const defaultTextTranslateY = height * (quietText ? 4 / 46 : 8 / 46);

  return (
    <View
      className="flex-row items-center gap-3"
      accessible={Boolean(label)}
      accessibilityLabel={label}
    >
      <Image
        source={logo}
        resizeMode="contain"
        fadeDuration={0}
        style={{ width: height * aspectRatio, height }}
      />
      <Text
        useAppFont={false}
        className={[
          quietText
            ? ''
            : 'text-[28px] font-black leading-[28px] tracking-[-0.8px]',
          'text-cocoa',
        ].join(' ')}
        style={{
          color: textColor,
          ...(quietText
            ? {
                fontSize: 38,
                lineHeight: 42,
                fontWeight: '700' as const,
                letterSpacing: 0,
              }
            : null),
          transform: [{ translateY: textTranslateY ?? defaultTextTranslateY }],
        }}
      >
        bootyblock
      </Text>
    </View>
  );
}
