import {
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PagerView, {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
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
    const pagerRef = useRef<PagerView>(null);
    const handlePageScroll = useCallback(
      (event: PagerViewOnPageScrollEvent) => {
        progress.value =
          event.nativeEvent.position + event.nativeEvent.offset;
      },
      [progress],
    );
    const handlePageSelected = useCallback(
      (event: PagerViewOnPageSelectedEvent) => {
        onPageSelected(event.nativeEvent.position);
      },
      [onPageSelected],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        setPage: (page) => {
          onPageSelected(page);
          pagerRef.current?.setPage(page);
        },
      }),
      [onPageSelected],
    );

    return (
      <PagerView
        ref={pagerRef}
        initialPage={0}
        offscreenPageLimit={3}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
        overdrag
        style={style}
      >
        {children}
      </PagerView>
    );
  },
);
