import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, Sprout, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Text } from '../components/AppText';
import { PeachPatch3D } from '../components/PeachPatch3D';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { getPeachPatchStage } from '../lib/peachPatch';
import { getBootyProgress } from '../lib/progression';
import { countSquatActivityDays, GLUTE_JOURNEY_DAYS } from '../lib/squatActivity';
import { useBootyblock } from '../lib/store/BootyblockProvider';

const JOURNEY_GRADIENT = ['#FFF1F6', '#FFF8F2', '#FFD5E7'] as const;

export default function Journey() {
  const {
    bonusXp,
    currentStreak,
    peachBalance,
    unlockHistory,
  } = useBootyblock();
  const pagerRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  const completedDays = useMemo(() => countSquatActivityDays(unlockHistory), [unlockHistory]);
  const progress = useMemo(
    () => getBootyProgress(unlockHistory, currentStreak, bonusXp),
    [bonusXp, currentStreak, unlockHistory],
  );
  const patchStage = useMemo(() => getPeachPatchStage(completedDays), [completedDays]);
  const percent = Math.round((completedDays / GLUTE_JOURNEY_DAYS) * 100);

  function goToPage(nextPage: number) {
    pagerRef.current?.scrollTo({ x: nextPage * pageWidth, animated: true });
    setPage(nextPage);
    void Haptics.selectionAsync().catch(() => {});
  }

  function handlePageSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (nextPage !== page) {
      setPage(nextPage);
      void Haptics.selectionAsync().catch(() => {});
    }
  }

  return (
    <Screen
      backgroundColor="#FFF1F6"
      backgroundGradient={JOURNEY_GRADIENT}
      flush
      scroll={false}
    >
      <StatusBar style={page === 1 ? 'light' : 'dark'} />
      <View style={styles.screen}>
        <View style={[styles.topBar, page === 1 && styles.topBarOnWorld]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close glute journey"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.topButton, page === 1 && styles.topButtonOnWorld, pressed && styles.buttonPressed]}
          >
            <X size={21} stroke={page === 1 ? '#FFFFFF' : colors.cocoa} strokeWidth={2.6} />
          </Pressable>
          <View style={styles.topTitle}>
            <Text style={[styles.eyebrow, page === 1 && styles.worldEyebrow]}>bootyblock</Text>
            <Text style={[styles.headerTitle, page === 1 && styles.worldHeaderTitle]}>90 day glute journey</Text>
          </View>
          <View style={styles.topButtonSpacer} />
        </View>

        <View
          onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
          style={styles.pagerFrame}
        >
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            bounces={false}
            scrollEnabled={page === 0}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePageSettled}
            onScrollEndDrag={handlePageSettled}
            style={styles.pager}
          >
            <View style={[styles.page, { width: pageWidth }]}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.overviewContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.progressHero}>
                  <Text style={styles.progressNumber}>{percent}%</Text>
                  <Text style={styles.progressLabel}>of your journey complete</Text>
                  <Text style={styles.progressSupport}>
                    {completedDays === 0
                      ? 'your first squat day brings the patch to life'
                      : `${completedDays} of ${GLUTE_JOURNEY_DAYS} days are growing your patch`}
                  </Text>
                </View>

                <LinearGradient
                  colors={['rgba(255,255,255,0.92)', 'rgba(255,244,248,0.92)']}
                  style={styles.calendarSurface}
                >
                  <View style={styles.calendarHeader}>
                    <View>
                      <Text style={styles.calendarEyebrow}>YOUR CONSISTENCY</Text>
                      <Text style={styles.calendarTitle}>every day leaves a mark</Text>
                    </View>
                    <Text style={styles.fireLabel}>🔥 {currentStreak}</Text>
                  </View>

                  <View
                    accessibilityLabel={`${completedDays} of 90 journey days complete`}
                    style={styles.journeyGrid}
                  >
                    {Array.from({ length: 9 }, (_, row) => (
                      <View key={row} style={styles.journeyRow}>
                        {Array.from({ length: 10 }, (_, column) => {
                          const day = row * 10 + column;
                          const complete = day < completedDays;
                          const current = day === completedDays && completedDays < GLUTE_JOURNEY_DAYS;
                          return (
                            <View
                              key={column}
                              style={[
                                styles.journeyCell,
                                complete && styles.journeyCellComplete,
                                current && styles.journeyCellCurrent,
                              ]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </LinearGradient>

                <View style={styles.statRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{progress.xp}</Text>
                    <Text style={styles.statLabel}>booty XP</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{peachBalance}</Text>
                    <Text style={styles.statLabel}>peaches</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{progress.currentLevel.level}</Text>
                    <Text style={styles.statLabel}>level</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open full activity history"
                  onPress={() => router.push('/statistics')}
                  style={({ pressed }) => [styles.activityLink, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.activityLinkText}>view full activity</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Explore your 3D peach patch"
                  onPress={() => goToPage(1)}
                  style={({ pressed }) => [styles.swipePrompt, pressed && styles.swipePromptPressed]}
                >
                  <View style={styles.swipePromptIcon}>
                    <Sprout size={20} stroke="#FFFFFF" strokeWidth={2.6} />
                  </View>
                  <View style={styles.swipePromptCopy}>
                    <Text style={styles.swipePromptTitle}>explore your peach patch</Text>
                    <Text style={styles.swipePromptBody}>swipe left to enter the farm</Text>
                  </View>
                  <Text style={styles.swipeArrow}>→</Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={[styles.page, styles.worldPage, { width: pageWidth }]}>
              <PeachPatch3D completedDays={completedDays} />

              <View pointerEvents="none" style={styles.worldHud}>
                <View style={styles.stagePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.stagePillText}>day {completedDays} · {patchStage.title}</Text>
                </View>
                <Text style={styles.worldTitle}>your peach patch</Text>
                <Text style={styles.worldSubtitle}>
                  {patchStage.farmers} farmers · {patchStage.peachTrees} peach trees
                </Text>
              </View>

              <View style={styles.worldFooter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Return to journey overview"
                  onPress={() => goToPage(0)}
                  style={({ pressed }) => [styles.backToJourney, pressed && styles.buttonPressed]}
                >
                  <ChevronLeft size={17} stroke="#FFFFFF" strokeWidth={2.8} />
                  <Text style={styles.backToJourneyText}>journey</Text>
                </Pressable>
                <View pointerEvents="none" style={styles.gestureHint}>
                  <Text style={styles.gestureHintText}>drag to orbit · pinch to zoom</Text>
                  {patchStage.nextUnlockDay ? (
                    <Text style={styles.unlockHint}>
                      {patchStage.nextUnlock} unlocks on day {patchStage.nextUnlockDay}
                    </Text>
                  ) : (
                    <Text style={styles.unlockHint}>the whole patch is in bloom</Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        <View pointerEvents="box-none" style={styles.pageDots}>
          {[0, 1].map((dot) => (
            <Pressable
              key={dot}
              accessibilityRole="tab"
              accessibilityLabel={dot === 0 ? 'Journey overview' : '3D peach patch'}
              accessibilityState={{ selected: page === dot }}
              onPress={() => goToPage(dot)}
              hitSlop={10}
              style={[
                styles.pageDot,
                page === 1 && styles.pageDotOnWorld,
                page === dot && styles.pageDotActive,
                page === 1 && page === dot && styles.pageDotActiveOnWorld,
              ]}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 8,
    zIndex: 4,
  },
  topBarOnWorld: {
    backgroundColor: '#7DB8E8',
  },
  topButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  topButtonOnWorld: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  topButtonSpacer: {
    height: 42,
    width: 42,
  },
  topTitle: {
    alignItems: 'center',
    flex: 1,
  },
  eyebrow: {
    color: colors.raspberry,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  worldEyebrow: {
    color: 'rgba(255,255,255,0.72)',
  },
  headerTitle: {
    color: colors.cocoa,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  worldHeaderTitle: {
    color: '#FFFFFF',
  },
  pagerFrame: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  overviewContent: {
    paddingBottom: 74,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  progressHero: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 4,
  },
  progressNumber: {
    color: colors.raspberry,
    fontSize: 60,
    fontWeight: '900',
    letterSpacing: -3.5,
    lineHeight: 64,
  },
  progressLabel: {
    color: colors.cocoa,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  progressSupport: {
    color: colors.mink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
    textAlign: 'center',
  },
  calendarSurface: {
    borderColor: 'rgba(233,30,115,0.1)',
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  calendarHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarEyebrow: {
    color: colors.raspberry,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.25,
  },
  calendarTitle: {
    color: colors.cocoa,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  fireLabel: {
    color: colors.cocoa,
    fontSize: 17,
    fontWeight: '900',
  },
  journeyGrid: {
    gap: 4,
    marginTop: 17,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  journeyCell: {
    aspectRatio: 1,
    backgroundColor: 'rgba(233,30,115,0.09)',
    borderColor: 'rgba(233,30,115,0.08)',
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
  },
  journeyCellComplete: {
    backgroundColor: colors.raspberry,
    borderColor: colors.raspberry,
  },
  journeyCellCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.raspberry,
    borderWidth: 2,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingVertical: 23,
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.cocoa,
    fontSize: 23,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.mink,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  statDivider: {
    backgroundColor: 'rgba(91,43,62,0.12)',
    height: 30,
    width: 1,
  },
  activityLink: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activityLinkText: {
    color: colors.raspberry,
    fontSize: 13,
    fontWeight: '900',
  },
  swipePrompt: {
    alignItems: 'center',
    backgroundColor: colors.raspberry,
    borderRadius: 24,
    flexDirection: 'row',
    marginTop: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    shadowColor: colors.raspberry,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  swipePromptPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  swipePromptIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 17,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  swipePromptCopy: {
    flex: 1,
    marginLeft: 12,
  },
  swipePromptTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  swipePromptBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  swipeArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  worldPage: {
    backgroundColor: '#7DB8E8',
  },
  worldHud: {
    left: 18,
    position: 'absolute',
    top: 18,
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
    letterSpacing: 0.15,
  },
  worldTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 11,
    textShadowColor: 'rgba(35,72,104,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  worldSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  worldFooter: {
    alignItems: 'flex-end',
    bottom: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
  },
  backToJourney: {
    alignItems: 'center',
    backgroundColor: 'rgba(32,74,108,0.48)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backToJourneyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 2,
  },
  gestureHint: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(32,74,108,0.48)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 218,
    paddingHorizontal: 11,
    paddingVertical: 8,
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
  pageDots: {
    alignSelf: 'center',
    bottom: 19,
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    zIndex: 5,
  },
  pageDot: {
    backgroundColor: 'rgba(233,30,115,0.22)',
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  pageDotOnWorld: {
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  pageDotActive: {
    backgroundColor: colors.raspberry,
    width: 20,
  },
  pageDotActiveOnWorld: {
    backgroundColor: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
