import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { PeachPatch3D } from '../components/PeachPatch3D';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { getPeachPatchStage } from '../lib/peachPatch';
import { countSquatActivityDays } from '../lib/squatActivity';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Journey() {
  const { unlockHistory } = useBootyblock();
  const completedDays = useMemo(() => countSquatActivityDays(unlockHistory), [unlockHistory]);
  const patchStage = useMemo(() => getPeachPatchStage(completedDays), [completedDays]);

  return (
    <Screen backgroundColor="#7DB8E8" flush scroll={false}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <PeachPatch3D completedDays={completedDays} />

        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Peach Patch"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          >
            <X size={21} stroke="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
          <View pointerEvents="none" style={styles.topTitle}>
            <Text style={styles.eyebrow}>bootyblock</Text>
            <Text style={styles.headerTitle}>your peach patch</Text>
          </View>
          <View style={styles.closeButtonSpacer} />
        </View>

        <View pointerEvents="none" style={styles.patchHud}>
          <View style={styles.stagePill}>
            <View style={styles.liveDot} />
            <Text style={styles.stagePillText}>day {completedDays} · {patchStage.title}</Text>
          </View>
          <Text style={styles.patchTitle}>your peach patch</Text>
          <Text style={styles.patchSubtitle}>
            {patchStage.farmers} farmers · {patchStage.peachTrees} peach trees
          </Text>
        </View>

        <View pointerEvents="none" style={styles.gestureHint}>
          <Text style={styles.gestureHintText}>drag to orbit · pinch to zoom</Text>
          <Text style={styles.unlockHint}>
            {patchStage.nextUnlockDay
              ? `${patchStage.nextUnlock} unlocks on day ${patchStage.nextUnlockDay}`
              : 'the whole patch is in bloom'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#7DB8E8',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 8,
    zIndex: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(32,74,108,0.48)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  closeButtonSpacer: {
    height: 42,
    width: 42,
  },
  topTitle: {
    alignItems: 'center',
    flex: 1,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  patchHud: {
    left: 18,
    position: 'absolute',
    top: 82,
  },
  stagePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveDot: {
    backgroundColor: '#51A54D',
    borderRadius: 4,
    height: 7,
    marginRight: 6,
    width: 7,
  },
  stagePillText: {
    color: colors.cocoa,
    fontSize: 10,
    fontWeight: '900',
  },
  patchTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 11,
    textShadowColor: 'rgba(35,72,104,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  patchSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  gestureHint: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(32,74,108,0.48)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    bottom: 18,
    maxWidth: 218,
    paddingHorizontal: 11,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
  },
  gestureHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  unlockHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
