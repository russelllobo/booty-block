import { Image } from 'react-native';

type BrandLogoProps = {
  height?: number;
  label?: string;
};

const logo = require('../assets/logo.png');
const aspectRatio = 695 / 1024;

export function BrandLogo({ height = 40, label }: BrandLogoProps) {
  return (
    <Image
      source={logo}
      resizeMode="contain"
      accessible={Boolean(label)}
      accessibilityLabel={label}
      style={{ width: height * aspectRatio, height }}
    />
  );
}
