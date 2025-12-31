import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  type SharedValue,
} from 'react-native-reanimated';
import type { RecordingEvent } from '../types/recording';

interface RecordingTimelineProps {
  isRecording: SharedValue<boolean>;
  duration: SharedValue<number>;
  events: SharedValue<RecordingEvent[]>;
  scrollPosition: SharedValue<number>;
  height?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
export const TIMELINE_WIDTH = SCREEN_WIDTH - 32;
export const PIXELS_PER_SECOND = 100;

export default function RecordingTimeline({
  isRecording,
  duration,
  events,
  scrollPosition,
  height = 120,
}: RecordingTimelineProps) {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  // Derive playhead position from duration
  const playheadPosition = useDerivedValue(() => {
    return duration.get() * PIXELS_PER_SECOND;
  });

  // Derive timeline width from duration
  const timelineWidth = useDerivedValue(() => {
    return Math.max(TIMELINE_WIDTH, duration.get() * PIXELS_PER_SECOND + 100);
  });

  // Scroll to position on the UI thread using derived value
  useDerivedValue(() => {
    const scrollX = scrollPosition.get();
    scrollTo(scrollViewRef, scrollX, 0, false);
  });

  const playheadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playheadPosition.get() }],
  }));

  const timelineContainerStyle = useAnimatedStyle(() => ({
    width: timelineWidth.get(),
    height,
  }));

  // Derive event markers from events shared value
  const transientEvents = useDerivedValue(() => {
    return events.get().filter((e) => e.type === 'transient');
  });

  const continuousBlocks = useDerivedValue(() => {
    const blocks: Array<{ startTime: number; endTime: number }> = [];
    let startTime = -1;

    for (const event of events.get()) {
      if (event.type === 'continuous_start') {
        startTime = event.timestamp;
      } else if (event.type === 'continuous_end' && startTime >= 0) {
        blocks.push({ startTime, endTime: event.timestamp });
        startTime = -1;
      }
    }

    // Handle ongoing continuous session
    if (startTime >= 0 && isRecording.get()) {
      blocks.push({ startTime, endTime: duration.get() });
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
      >
        <Animated.View style={timelineContainerStyle}>
          {/* Grid lines - static for now */}
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={`grid-${i}`}
              style={[styles.gridLine, { left: i * PIXELS_PER_SECOND, height }]}
            />
          ))}

          {/* Transient markers */}
          <TransientMarkers events={transientEvents} height={height} />

          {/* Continuous blocks */}
          <ContinuousBlocks blocks={continuousBlocks} height={height} />

          {/* Playhead */}
          <Animated.View style={[styles.playhead, { height }, playheadStyle]} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// Separate component for transient markers with animated rendering
function TransientMarkers({
  events,
  height,
}: {
  events: SharedValue<RecordingEvent[]>;
  height: number;
}) {
  const markerStyles = useDerivedValue(() => {
    return events.get().map((event) => ({
      left: event.timestamp * PIXELS_PER_SECOND,
    }));
  });

  return (
    <Animated.View style={StyleSheet.absoluteFill}>
      {Array.from({ length: 50 }).map((_, index) => (
        <TransientMarker
          key={`transient-${index}`}
          index={index}
          markerStyles={markerStyles}
          height={height}
        />
      ))}
    </Animated.View>
  );
}

function TransientMarker({
  index,
  markerStyles,
  height,
}: {
  index: number;
  markerStyles: SharedValue<Array<{ left: number }>>;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const markers = markerStyles.get();
    if (index >= markers.length) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      left: markers[index].left,
    };
  });

  return (
    <Animated.View
      style={[styles.transientMarker, { height: height - 20 }, style]}
    />
  );
}

// Separate component for continuous blocks
function ContinuousBlocks({
  blocks,
  height,
}: {
  blocks: SharedValue<Array<{ startTime: number; endTime: number }>>;
  height: number;
}) {
  return (
    <Animated.View style={StyleSheet.absoluteFill}>
      {Array.from({ length: 10 }).map((_, index) => (
        <ContinuousBlock
          key={`continuous-${index}`}
          index={index}
          blocks={blocks}
          height={height}
        />
      ))}
    </Animated.View>
  );
}

function ContinuousBlock({
  index,
  blocks,
  height,
}: {
  index: number;
  blocks: SharedValue<Array<{ startTime: number; endTime: number }>>;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const blockList = blocks.get();
    if (index >= blockList.length) {
      return { opacity: 0 };
    }
    const block = blockList[index];
    const left = block.startTime * PIXELS_PER_SECOND;
    const width = (block.endTime - block.startTime) * PIXELS_PER_SECOND;
    return {
      opacity: 1,
      left,
      width: Math.max(width, 4),
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
    width: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
