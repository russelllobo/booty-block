import { Text, View } from 'react-native';

type ProgressPillProps = {
  label: string;
  value: string;
  tone?: 'pink' | 'mint' | 'cream';
};

export function ProgressPill({ label, value, tone = 'pink' }: ProgressPillProps) {
  const background = tone === 'mint' ? 'bg-mint' : tone === 'cream' ? 'bg-cream' : 'bg-white/80';

  return (
    <View className={`rounded-3xl ${background} px-5 py-4`}>
      <Text className="text-xs font-bold uppercase tracking-[1.8px] text-mink">{label}</Text>
      <Text className="mt-1 text-2xl font-black text-cocoa">{value}</Text>
    </View>
  );
}
