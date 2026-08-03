import {
  Children,
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useEffect,
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

export type StoryPagerHandle = {
  setPage: (page: number) => void;
};

type StoryPagerProps = {
  children: ReactNode;
  onPageSelected: (page: number) => void;
  initialPage?: number;
  style?: StyleProp<ViewStyle>;
};

export const StoryPager = forwardRef<StoryPagerHandle, StoryPagerProps>(
  function StoryPager({ children, initialPage = 0, onPageSelected, style }, forwardedRef) {
    const scrollRef = useRef<ScrollView>(null);
    const selectedPageRef = useRef(initialPage);
    const [pageWidth, setPageWidth] = useState(0);

    useEffect(() => {
      if (pageWidth <= 0 || initialPage <= 0) return;
      scrollRef.current?.scrollTo({ x: initialPage * pageWidth, animated: false });
    }, [initialPage, pageWidth]);
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
          scrollRef.current?.scrollTo({ x: page * pageWidth, animated: true });
          reportSelectedPage(page);
        },
      }),
      [pageWidth, reportSelectedPage],
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
