import { Image } from 'react-native';

export function PeachIcon({ size = 28 }: { size?: number }) {
  return (
    <Image
      accessibilityElementsHidden
      resizeMode="contain"
      source={require('../assets/peaches-icon.png')}
      style={{ height: size, width: size }}
    />
  );
}
