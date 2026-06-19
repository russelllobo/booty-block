import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, CheckCircle2, X } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { PoseOverlay } from '../components/PoseOverlay';
import { ProgressPill } from '../components/ProgressPill';
import { Screen } from '../components/Screen';
import { MINUTES_TO_SQUATS } from '../constants/bootyblock';
import { colors } from '../constants/theme';
import { usePoseSession } from '../lib/services/pose';
import { useBootyblock } from '../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../modules/booty-pose/src/BootyPoseCameraView';

export default function Session() {
  const { requestedMinutes, grantUnlock } = useBootyblock();
  const target = requestedMinutes * MINUTES_TO_SQUATS;
  const [permission, requestPermission] = useCameraPermissions();
  const pose = usePoseSession({ target, active: Boolean(permission?.granted) });
  const progress = useMemo(() => Math.min(1, pose.count / target), [pose.count, target]);

  useEffect(() => {
    if (pose.count >= target) {
      void grantUnlock(requestedMinutes).then(() => router.replace('/success'));
    }
  }, [grantUnlock, pose.count, requestedMinutes, target]);

  return (
    <Screen scroll={false} flush>
      <View className="flex-1 bg-cocoa">
        {permission?.granted ? (
          Platform.OS === 'ios' ? (
            <BootyPoseCameraView
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />
          ) : (
            <CameraView
              facing="front"
              mirror
              active
              className="absolute inset-0"
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              onMountError={(error) => console.error('Session camera failed to mount:', error.message)}
            />
          )
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-cocoa px-8">
            <Camera size={48} stroke={colors.petal} />
            <Text className="mt-5 text-center text-2xl font-black text-white">Camera required</Text>
            <Text className="mt-2 text-center text-base font-semibold leading-6 text-petal">
              Bootyblock needs the camera to count reps on-device.
            </Text>
            <View className="mt-6 w-full">
              <Button label="Allow camera" icon={Camera} onPress={requestPermission} />
            </View>
          </View>
        )}

        <View className="absolute inset-0 border-[18px] border-white/10" pointerEvents="none" />
        <PoseOverlay
          landmarks={pose.landmarks}
          phase={pose.phase}
          visible={pose.visible}
          frameWidth={pose.frameWidth}
          frameHeight={pose.frameHeight}
        />
        {!pose.visible && (
          <View className="absolute left-8 right-8 top-28 rounded-[32px] border-2 border-dashed border-white/60 py-36" pointerEvents="none" />
        )}

        <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-6 pt-16">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close workout"
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-white/20"
          >
            <X size={22} stroke={colors.white} />
          </Pressable>
          <View className="rounded-full bg-white/20 px-5 py-3">
            <Text className="text-sm font-black text-white">{requestedMinutes} min unlock</Text>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 rounded-t-[38px] bg-blush px-6 pb-10 pt-6">
          <View className="mb-5 h-3 overflow-hidden rounded-full bg-petal">
            <View className="h-full rounded-full bg-raspberry" style={{ width: `${progress * 100}%` }} />
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-sm font-black uppercase tracking-[2px] text-mink">Squats</Text>
              <Text className="text-7xl font-black text-cocoa">
                {pose.count}
                <Text className="text-3xl text-mink">/{target}</Text>
              </Text>
            </View>
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-mint">
              <CheckCircle2 size={30} stroke={colors.cocoa} />
            </View>
          </View>

          <Text className="mt-2 text-lg font-black text-raspberry">{pose.hint}</Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <ProgressPill label="Phase" value={pose.phase} tone="cream" />
            </View>
            <View className="flex-1">
              <ProgressPill label="Confidence" value={`${Math.round(pose.confidence * 100)}%`} tone="mint" />
            </View>
          </View>
          {pose.metrics.kneeAngle > 0 && (
            <Text className="mt-3 text-center text-xs font-bold text-mink">
              Knee {Math.round(pose.metrics.kneeAngle)}° · Torso {Math.round(pose.metrics.torsoLean)}° · Depth{' '}
              {Math.round(pose.metrics.depth * 100)}%
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
