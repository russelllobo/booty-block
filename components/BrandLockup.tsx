import { Image, Text, View } from 'react-native';

type BrandLockupProps = {
  height?: number;
  label?: string;
  textVariant?: 'brand' | 'quiet';
};

const logo = require('../assets/logo-small.png');
const aspectRatio = 695 / 1024;

export function BrandLockup({ height = 46, label, textVariant = 'brand' }: BrandLockupProps) {
  const quietText = textVariant === 'quiet';

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
        className={[
          quietText
            ? ''
            : 'text-[28px] font-black leading-[28px] tracking-[-0.8px]',
          'text-cocoa',
        ].join(' ')}
        style={{
          ...(quietText
            ? {
                fontSize: 38,
                lineHeight: 42,
                fontWeight: '700' as const,
                letterSpacing: 0,
              }
            : null),
          transform: [{ translateY: height * (quietText ? 4 / 46 : 8 / 46) }],
        }}
      >
        BootyBlock
      </Text>
    </View>
  );
}
