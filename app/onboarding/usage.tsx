import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Clock3, Sparkles, Target } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel, useStepDirection } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const MIN_HOURS = 0.5;
const MAX_HOURS = 12;
const SLIDER_STEP = 0.5;

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function UsageHeader({ step, back }: { step: number; back: () => void }) {
  return <OnboardingProgress step={step + 3} onBack={back} />;
}

function TimeSlider({
  value,
  maximumValue,
  onChange,
  tone,
}: {
  value: number;
  maximumValue: number;
  onChange: (value: number) => void;
  tone: 'pink' | 'mint';
}) {
  const lastValue = useRef(value);
  const [trackWidth, setTrackWidth] = useState(0);
  const accent = tone === 'pink' ? colors.raspberry : '#32B764';
  const progress = (value - MIN_HOURS) / (maximumValue - MIN_HOURS || 1);

  function update(nextValue: number) {
    const steppedValue = Math.round(nextValue / SLIDER_STEP) * SLIDER_STEP;
    const clampedValue = Math.min(maximumValue, Math.max(MIN_HOURS, steppedValue));

    onChange(clampedValue);
    if (clampedValue !== lastValue.current) {
      lastValue.current = clampedValue;
      void Haptics.selectionAsync();
    }
  }

  function updateFromPosition(position: number) {
    if (!trackWidth) return;
    update(MIN_HOURS + (Math.min(trackWidth, Math.max(0, position)) / trackWidth) * (maximumValue - MIN_HOURS));
  }

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      className="rounded-[32px] border border-white/80 bg-white/80 px-6 pb-6 pt-7"
      style={shadow}
    >
      <View className="items-center">
        <View
          className="mb-3 rounded-full px-3.5 py-1"
          style={{ backgroundColor: tone === 'pink' ? colors.petal : colors.mint }}
        >
          <Text
            className="text-[11px] font-black uppercase tracking-[1.6px]"
            style={{ color: accent }}
          >
            Drag to choose
          </Text>
        </View>
        <Text
          className="text-[54px] font-black leading-[56px] tracking-[-2px]"
          style={{ color: accent }}
        >
          {formatHours(value)}
        </Text>
      </View>

      <View
        accessibilityLabel="Daily screen time in hours"
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: MIN_HOURS,
          max: maximumValue,
          now: value,
          text: formatHours(value),
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Increase screen time' },
          { name: 'decrement', label: 'Decrease screen time' },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          update(value + (nativeEvent.actionName === 'increment' ? SLIDER_STEP : -SLIDER_STEP));
        }}
        onLayout={handleTrackLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => updateFromPosition(event.nativeEvent.locationX)}
        onResponderMove={(event) => updateFromPosition(event.nativeEvent.locationX)}
        className="mt-6 h-12 justify-center"
      >
        <View className="h-2.5 overflow-hidden rounded-full bg-petal">
          <View
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: accent }}
          />
        </View>
        <View
          pointerEvents="none"
          className="absolute h-7 w-7 rounded-full border-[5px] border-white"
          style={[
            styles.sliderThumb,
            {
              backgroundColor: accent,
              left: progress * Math.max(0, trackWidth - 28),
            },
          ]}
        />
      </View>

      <View className="mt-2.5 flex-row justify-between px-1">
        <Text className="text-xs font-black text-mink">30m</Text>
        <Text className="text-xs font-black text-mink">{formatHours(maximumValue)}</Text>
      </View>
    </View>
  );
}

export default function Usage() {
  const { height } = useWindowDimensions();
  const { profileName, dailyScreenTimeGoalHours, dailyScreenTimeHours, setUsageTargets } =
    useBootyblock();
  const [step, setStep] = useState(1);
  const [currentHours, setCurrentHours] = useState(dailyScreenTimeHours);
  const [goalHours, setGoalHours] = useState(
    Math.min(dailyScreenTimeGoalHours, dailyScreenTimeHours),
  );
  const artworkHeight = Math.min(205, Math.max(150, height * 0.2));
  const direction = useStepDirection(step);

  const isGoal = step === 2;
  const name = profileName || 'you';
  const goalMaximum = Math.max(MIN_HOURS, currentHours);

  function back() {
    if (isGoal) {
      setStep(1);
      return;
    }
    router.back();
  }

  function continueFlow() {
    if (!isGoal) {
      setGoalHours((current) =>
        Math.min(current, Math.max(MIN_HOURS, currentHours - 0.5)),
      );
      setStep(2);
      return;
    }

    setUsageTargets(currentHours, goalHours);
    router.push('/onboarding/insights');
  }

  return (
    <Screen scroll={false}>
      <UsageHeader step={step} back={back} />

      <SlidePanel stepKey={step} direction={direction}>
        <View className="flex-1">
          <View>
            <Text className="text-base font-bold leading-6 text-mink">
              {isGoal
                ? `No guilt, ${name}. Small changes stick.`
                : 'A quick reality check — no judgement.'}
            </Text>
            <Text className="mt-2 text-[33px] font-black leading-[37px] tracking-[-1.1px] text-cocoa">
              {isGoal
                ? 'How much time would you like to spend instead?'
                : 'How much time do you spend on your phone every day?'}
            </Text>
          </View>

          <View className="items-center pt-5">
            <View
              className="relative items-center justify-center overflow-hidden rounded-[36px] border border-white/80"
              style={[{ height: artworkHeight, width: '100%' }, shadow]}
            >
              <LinearGradient
                colors={
                  isGoal
                    ? ['#F2FFF4', '#D9FBE3', '#BFF7D3']
                    : ['#FFF8F3', '#FFE5EF', '#FFD6E7']
                }
                style={StyleSheet.absoluteFill}
              />
              <View className="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-white/35" />
              <View className="absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-white/30" />
              <Sparkles
                size={22}
                stroke={isGoal ? '#32B764' : colors.raspberry}
                strokeWidth={2}
                style={{ position: 'absolute', right: 28, top: 25, opacity: 0.65 }}
              />

              <View
                className={[
                  'h-24 w-24 items-center justify-center rounded-[34px]',
                  isGoal ? 'bg-mint' : 'bg-raspberry',
                ].join(' ')}
                style={shadow}
              >
                {isGoal ? (
                  <Target size={45} stroke={colors.cocoa} strokeWidth={2.4} />
                ) : (
                  <Clock3 size={45} stroke={colors.white} strokeWidth={2.4} />
                )}
              </View>
              <Text className="mt-4 text-sm font-black uppercase tracking-[1.8px] text-mink">
                {isGoal ? 'Your daily goal' : 'Your daily average'}
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center py-4">
            <TimeSlider
              value={isGoal ? goalHours : currentHours}
              maximumValue={isGoal ? goalMaximum : MAX_HOURS}
              onChange={isGoal ? setGoalHours : setCurrentHours}
              tone={isGoal ? 'mint' : 'pink'}
            />
          </View>

          <View className="pt-3">
            <Button
              label={isGoal ? 'Build my plan' : 'Continue'}
              onPress={continueFlow}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sliderThumb: {
    shadowColor: colors.cherry,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5,
  },
});
