import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import type { RecordingEvent } from '../types/recording';

type TimelineMode = 'recording' | 'playback' | 'idle';

interface RecordingTimelineProps {
  mode: SharedValue<TimelineMode>;
  isRecording: SharedValue<boolean>;
  isPlaying: SharedValue<boolean>;
  currentTime: SharedValue<number>;
  totalDuration: SharedValue<number>;
  events: SharedValue<RecordingEvent[]>;
  scrollX: SharedValue<number>;
  isUserScrolling: SharedValue<boolean>;
  onSeek: (time: number) => void;
  onPause: () => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  height?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
export const TIMELINE_WIDTH = SCREEN_WIDTH - 32;
export const PIXELS_PER_SECOND = 100;
export const PLAYHEAD_OFFSET = TIMELINE_WIDTH / 2;

export default function RecordingTimeline({
  mode,
  isRecording,
  isPlaying,
  currentTime,
  totalDuration,
  events,
  scrollX,
  isUserScrolling,
  onSeek,
  onPause,
  onUserScrollStart,
  onUserScrollEnd,
  height = 120,
}: RecordingTimelineProps) {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  // Track if user is actively dragging (finger on screen)
  const isDragging = useSharedValue(false);
  // Track if momentum is happening
  const isMomentumScrolling = useSharedValue(false);

  // Content width
  const contentWidth = useDerivedValue(() => {
    const m = mode.get();
    let maxTime = 0;
    if (m === 'recording') {
      maxTime = currentTime.get();
    } else if (m === 'playback') {
      maxTime = totalDuration.get();
    }
    return PLAYHEAD_OFFSET + maxTime * PIXELS_PER_SECOND + PLAYHEAD_OFFSET;
  });

  // Auto-scroll when not user scrolling (only when playing or recording)
  useDerivedValue(() => {
    const userScrolling = isDragging.get() || isMomentumScrolling.get();
    if (!userScrolling) {
      scrollTo(scrollViewRef, scrollX.get(), 0, false);
    }
    return scrollX.get();
  });

  // Handle scroll events
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isDragging.set(true);
      isMomentumScrolling.set(false);

      const m = mode.get();
      if (m !== 'playback') return;

      onUserScrollStart();

      // Pause if playing
      if (isPlaying.get()) {
        onPause();
      }
    },
    onScroll: (event) => {
      const m = mode.get();
      if (m !== 'playback') return;

      // Only update seek if user is scrolling (dragging or momentum)
      const userScrolling = isDragging.get() || isMomentumScrolling.get();
      if (userScrolling) {
        const time = Math.max(0, event.contentOffset.x / PIXELS_PER_SECOND);
        onSeek(time);
      }
    },
    onEndDrag: (event) => {
      isDragging.set(false);

      // Check if momentum will follow
      const hasVelocity = event.velocity && Math.abs(event.velocity.x) > 0;
      if (hasVelocity) {
        isMomentumScrolling.set(true);
      } else if (isUserScrolling.get()) {
        // No momentum, scroll ended
        onUserScrollEnd();
      }
    },
    onMomentumBegin: () => {
      isMomentumScrolling.set(true);
    },
    onMomentumEnd: () => {
      isMomentumScrolling.set(false);
      // User scroll fully ended
      if (isUserScrolling.get()) {
        onUserScrollEnd();
      }
    },
  });

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    width: contentWidth.get(),
    height,
  }));

  // Scroll enabled as animated prop to avoid reading during render
  const scrollViewAnimatedProps = useAnimatedProps(() => ({
    scrollEnabled: mode.get() === 'playback',
  }));

  // Derive transient markers
  const transientMarkers = useDerivedValue(() => {
    return events
      .get()
      .filter((e) => e.type === 'transient')
      .map((e) => ({
        position: PLAYHEAD_OFFSET + e.timestamp * PIXELS_PER_SECOND,
      }));
  });

  // Derive continuous blocks
  const continuousBlocks = useDerivedValue(() => {
    const blocks: Array<{ left: number; width: number }> = [];
    let startTime = -1;

    for (const event of events.get()) {
      if (event.type === 'continuous_start') {
        startTime = event.timestamp;
      } else if (event.type === 'continuous_end' && startTime >= 0) {
        blocks.push({
          left: PLAYHEAD_OFFSET + startTime * PIXELS_PER_SECOND,
          width: (event.timestamp - startTime) * PIXELS_PER_SECOND,
        });
        startTime = -1;
      }
    }

    // Handle ongoing continuous during recording
    if (startTime >= 0 && isRecording.get()) {
      blocks.push({
        left: PLAYHEAD_OFFSET + startTime * PIXELS_PER_SECOND,
        width: (currentTime.get() - startTime) * PIXELS_PER_SECOND,
      });
    }

    return blocks;
  });

  return (
    <View style={[styles.container, { height }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        animatedProps={scrollViewAnimatedProps}
        onScroll={scrollHandler}
        decelerationRate="normal"
      >
        <Animated.View style={containerStyle}>
          <GridLines height={height} />
          <TransientMarkers markers={transientMarkers} height={height} />
          <ContinuousBlocksView blocks={continuousBlocks} height={height} />
        </Animated.View>
      </Animated.ScrollView>

      {/* Fixed playhead */}
      <View
        style={[styles.playhead, { height, left: PLAYHEAD_OFFSET - 1 }]}
        pointerEvents="none"
      />
    </View>
  );
}

function GridLines({ height }: { height: number }) {
  return (
    <>
      {Array.from({ length: 61 }).map((_, i) => (
        <View
          key={`grid-${i}`}
          style={[
            styles.gridLine,
            { left: PLAYHEAD_OFFSET + i * PIXELS_PER_SECOND, height },
          ]}
        />
      ))}
    </>
  );
}

function TransientMarkers({
  markers,
  height,
}: {
  markers: SharedValue<Array<{ position: number }>>;
  height: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 50 }).map((_, i) => (
        <TransientMarker key={i} index={i} markers={markers} height={height} />
      ))}
    </View>
  );
}

function TransientMarker({
  index,
  markers,
  height,
}: {
  index: number;
  markers: SharedValue<Array<{ position: number }>>;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const list = markers.get();
    if (index >= list.length) return { opacity: 0 };
    const marker = list[index];
    if (!marker) return { opacity: 0 };
    return { opacity: 1, left: marker.position };
  });

  return (
    <Animated.View
      style={[styles.transientMarker, { height: height - 20 }, style]}
    />
  );
}

function ContinuousBlocksView({
  blocks,
  height,
}: {
  blocks: SharedValue<Array<{ left: number; width: number }>>;
  height: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 10 }).map((_, i) => (
        <ContinuousBlock key={i} index={i} blocks={blocks} height={height} />
      ))}
    </View>
  );
}

function ContinuousBlock({
  index,
  blocks,
  height,
}: {
  index: number;
  blocks: SharedValue<Array<{ left: number; width: number }>>;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const list = blocks.get();
    if (index >= list.length) return { opacity: 0 };
    const block = list[index];
    if (!block) return { opacity: 0 };
    return {
      opacity: 1,
      left: block.left,
      width: Math.max(block.width, 4),
    };
  });

  return (
    <Animated.View
      style={[
        styles.continuousBlock,
        { height: 40, top: (height - 40) / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  gridLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#2C2C2E',
  },
  transientMarker: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#007AFF',
    top: 10,
  },
  continuousBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 59, 48, 0.6)',
    borderRadius: 4,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
