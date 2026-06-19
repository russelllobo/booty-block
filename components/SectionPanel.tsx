import { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

type SectionPanelProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
}>;

export function SectionPanel({ title, subtitle, children }: SectionPanelProps) {
  return (
    <View className="rounded-[28px] border border-white/70 bg-white/65 p-5">
      {title ? <Text className="text-xl font-black text-cocoa">{title}</Text> : null}
      {subtitle ? <Text className="mt-1 text-sm font-semibold leading-5 text-mink">{subtitle}</Text> : null}
      <View className={title || subtitle ? 'mt-5' : ''}>{children}</View>
    </View>
  );
}
