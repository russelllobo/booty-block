import {
  Children,
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SharedValue } from 'react-native-reanimated';

export type StoryPagerHandle = {
  setPage: (page: number) => void;
};

type StoryPagerProps = {
  children: ReactNode;
  onPageSelected: (page: number) => void;
  progress: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

export const StoryPager = forwardRef<StoryPagerHandle, StoryPagerProps>(
  function StoryPager({ children, onPageSelected, progress, style }, forwardedRef) {
    const scrollRef = useRef<ScrollView>(null);
    const selectedPageRef = useRef(0);
    const [pageWidth, setPageWidth] = useState(0);
    const reportSelectedPage = useCallback(
      (page: number) => {
        if (selectedPageRef.current === page) return;
        selectedPageRef.current = page;
        onPageSelected(page);
      },
      [onPageSelected],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        setPage: (page) => {
          reportSelectedPage(page);
          scrollRef.current?.scrollTo({ x: page * pageWidth, animated: true });
        },
      }),
      [pageWidth, reportSelectedPage],
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (pageWidth <= 0) return;
        const nextProgress = event.nativeEvent.contentOffset.x / pageWidth;
        const nearestPage = Math.round(nextProgress);
        progress.value = nextProgress;

        if (Math.abs(nextProgress - nearestPage) < 0.01) {
          reportSelectedPage(nearestPage);
        }
      },
      [pageWidth, progress, reportSelectedPage],
    );

    const handleScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (pageWidth <= 0) return;
        reportSelectedPage(
          Math.round(event.nativeEvent.contentOffset.x / pageWidth),
        );
      },
      [pageWidth, reportSelectedPage],
    );

    return (
      <View
        style={style}
        onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
        >
          {Children.map(children, (child) => (
            <View style={{ width: pageWidth }}>{child}</View>
          ))}
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
});
