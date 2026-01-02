import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';
import Animated, {
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { startHaptic } from 'react-native-ahaps';
import type { RecordingEvent } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';

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
const DEFAULT_HEIGHT = 140;

const INTENSITY_COLOR = '#00B4FF';
const SHARPNESS_COLOR = '#FF8C32';
const TRANSIENT_INTENSITY_COLOR = '#00E5FF';
const TRANSIENT_SHARPNESS_COLOR = '#FFB366';

export const TIMELINE_WIDTH = SCREEN_WIDTH - 32;
export const PIXELS_PER_MILLISECOND = 0.1;
const PIXELS_PER_SECOND = PIXELS_PER_MILLISECOND * 1000;
export const PLAYHEAD_OFFSET = TIMELINE_WIDTH / 2;

const DOWNSAMPLE_INTERVAL_PX = 1;

const MIN_SEGMENT_WIDTH_FOR_LINE = 15;

interface DataPoint {
  x: number;
  intensity: number;
  sharpness: number;
}

interface ContinuousSegment {
  points: DataPoint[];
  startX: number;
  endX: number;
}

const LANE_GAP = 4;
const LANE_PADDING = 6;

const MAX_CONTENT_WIDTH =
  PLAYHEAD_OFFSET + 120000 * PIXELS_PER_MILLISECOND + PLAYHEAD_OFFSET; // 120 seconds in ms

export default function RecordingTimeline({
  mode,
  isRecording: _isRecording,
  isPlaying,
  currentTime: _currentTime,
  totalDuration,
  events,
  scrollX,
  isUserScrolling,
  onSeek,
  onPause,
  onUserScrollStart,
  onUserScrollEnd,
  height = DEFAULT_HEIGHT,
}: RecordingTimelineProps) {
  void _isRecording;
  void _currentTime;

  const { colors } = useTheme();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const isDragging = useSharedValue(false);
  const isMomentumScrolling = useSharedValue(false);
  const hittingMaxScroll = useSharedValue(false);
  const lastHapticMark = useSharedValue(-1);

  const triggerHaptic = (intensity: number, sharpness: number) => {
    'worklet';
    startHaptic(
      [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: intensity },
            { type: 'sharpness', value: sharpness },
          ],
        },
      ],
      []
    );
  };

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isDragging.set(true);
      isMomentumScrolling.set(false);
      lastHapticMark.set(-1); // Reset to allow haptic on first mark

      scrollTo(scrollViewRef, scrollX.get(), 0, false);

      const m = mode.get();
      if (m !== 'playback') return;

      onUserScrollStart();
      if (isPlaying.get()) {
        onPause();
      }
    },

    onScroll: (event) => {
      const m = mode.get();
      if (m !== 'playback') return;

      const userScrolling = isDragging.get() || isMomentumScrolling.get();
      if (!userScrolling) return;

      const maxScroll = totalDuration.get() * PIXELS_PER_MILLISECOND;
      const rawX = event.contentOffset.x;
      const clampedX = Math.min(Math.max(0, rawX), maxScroll);

      if (clampedX !== rawX && !hittingMaxScroll.get()) {
        hittingMaxScroll.set(true);
        scrollTo(scrollViewRef, clampedX, 0, false);
      }
      if (clampedX === rawX) {
        hittingMaxScroll.set(false);
      }

      scrollX.set(clampedX);

      // Haptic feedback at timeline marks
      const currentTimeMs = clampedX / PIXELS_PER_MILLISECOND;
      const currentMark = Math.floor(currentTimeMs / 100); // 100ms precision
      const lastMark = lastHapticMark.get();

      if (currentMark !== lastMark) {
        lastHapticMark.set(currentMark);

        // Check if it's a full second mark (stronger haptic)
        if (currentMark % 10 === 0) {
          triggerHaptic(0.6, 0.8); // Stronger haptic at 1s marks
        } else {
          triggerHaptic(0.3, 0.7); // Light haptic at 0.1s marks
        }
      }

      onSeek(clampedX / PIXELS_PER_MILLISECOND); // Already in milliseconds
    },

    onEndDrag: (event) => {
      isDragging.set(false);

      const m = mode.get();
      if (m === 'playback') {
        const maxScroll = totalDuration.get() * PIXELS_PER_MILLISECOND;
        if (event.contentOffset.x > maxScroll) {
          scrollX.set(maxScroll);
          scrollTo(scrollViewRef, maxScroll, 0, true);
          onSeek(totalDuration.get());
        }
      }

      const hasVelocity = event.velocity && Math.abs(event.velocity.x) > 0;
      if (hasVelocity) {
        isMomentumScrolling.set(true);
      } else if (isUserScrolling.get()) {
        onUserScrollEnd();
      }
    },

    onMomentumBegin: () => {
      isMomentumScrolling.set(true);
    },

    onMomentumEnd: () => {
      isMomentumScrolling.set(false);

      const m = mode.get();
      if (m === 'playback') {
        const maxScroll = totalDuration.get() * PIXELS_PER_MILLISECOND;
        const currentScroll = scrollX.get();
        if (currentScroll > maxScroll) {
          scrollX.set(maxScroll);
          scrollTo(scrollViewRef, maxScroll, 0, true);
          onSeek(totalDuration.get()); // Already in milliseconds
        }
      }

      if (isUserScrolling.get()) {
        onUserScrollEnd();
      }
    },
  });

  const transients = useDerivedValue<DataPoint[]>(() => {
    return events
      .get()
      .filter((e) => e.type === 'transient')
      .map((e) => ({
        x: PLAYHEAD_OFFSET + e.timestamp * PIXELS_PER_MILLISECOND,
        intensity: e.intensity,
        sharpness: e.sharpness,
      }));
  });

  const continuousSegments = useDerivedValue<ContinuousSegment[]>(() => {
    const segments: ContinuousSegment[] = [];
    let currentSegment: ContinuousSegment | null = null;
    let lastX = -Infinity;

    for (const event of events.get()) {
      if (event.type === 'continuous_start') {
        const x = PLAYHEAD_OFFSET + event.timestamp * PIXELS_PER_MILLISECOND;
        currentSegment = {
          points: [
            { x, intensity: event.intensity, sharpness: event.sharpness },
          ],
          startX: x,
          endX: x,
        };
        lastX = x;
      } else if (
        (event.type === 'continuous_update' ||
          event.type === 'continuous_end') &&
        currentSegment
      ) {
        const x = PLAYHEAD_OFFSET + event.timestamp * PIXELS_PER_MILLISECOND;
        currentSegment.endX = x;

        if (
          x - lastX >= DOWNSAMPLE_INTERVAL_PX ||
          event.type === 'continuous_end'
        ) {
          currentSegment.points.push({
            x,
            intensity: event.intensity,
            sharpness: event.sharpness,
          });
          lastX = x;
        }

        if (event.type === 'continuous_end') {
          segments.push(currentSegment);
          currentSegment = null;
          lastX = -Infinity;
        }
      }
    }

    if (currentSegment && currentSegment.points.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  });

  const availableHeight = height - LANE_PADDING * 2 - LANE_GAP;
  const intensityLaneHeight = availableHeight * 0.6;
  const sharpnessLaneHeight = availableHeight * 0.4;
  const intensityLaneTop = LANE_PADDING;
  const intensityLaneBottom = intensityLaneTop + intensityLaneHeight;
  const sharpnessLaneTop = intensityLaneBottom + LANE_GAP;
  const sharpnessLaneBottom = sharpnessLaneTop + sharpnessLaneHeight;

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: colors.timelineBackground },
      ]}
    >
      <Canvas style={styles.canvas}>
        <Group>
          <GridLines
            height={height}
            scrollX={scrollX}
            gridColor={colors.timelineGrid}
            gridLightColor={colors.timelineGridLight}
          />
          <LaneSeparator y={height / 2} color={colors.timelineLaneSeparator} />
          <ContinuousLines
            segments={continuousSegments}
            scrollX={scrollX}
            intensityLaneTop={intensityLaneTop}
            intensityLaneBottom={intensityLaneBottom}
            sharpnessLaneTop={sharpnessLaneTop}
            sharpnessLaneBottom={sharpnessLaneBottom}
          />
          <TransientLines
            transients={transients}
            scrollX={scrollX}
            intensityLaneTop={intensityLaneTop}
            intensityLaneBottom={intensityLaneBottom}
            sharpnessLaneTop={sharpnessLaneTop}
            sharpnessLaneBottom={sharpnessLaneBottom}
          />
        </Group>
      </Canvas>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        decelerationRate="normal"
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: MAX_CONTENT_WIDTH }}
      >
        <View style={{ width: MAX_CONTENT_WIDTH, height }} />
      </Animated.ScrollView>

      <View
        style={[
          styles.playhead,
          {
            height,
            left: PLAYHEAD_OFFSET - 1,
            backgroundColor: colors.playhead,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

function GridLines({
  height,
  scrollX,
  gridColor,
  gridLightColor,
}: {
  height: number;
  scrollX: SharedValue<number>;
  gridColor: string;
  gridLightColor: string;
}) {
  const fullHeightPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();

    const startSecond = Math.max(
      0,
      Math.floor((scroll - PLAYHEAD_OFFSET) / PIXELS_PER_SECOND)
    );
    const endSecond =
      Math.ceil((scroll + TIMELINE_WIDTH) / PIXELS_PER_SECOND) + 1;

    for (let i = startSecond; i <= Math.min(endSecond, 120); i++) {
      const worldX = PLAYHEAD_OFFSET + i * PIXELS_PER_SECOND;
      const screenX = worldX - scroll;

      if (screenX >= -10 && screenX <= TIMELINE_WIDTH + 10) {
        p.moveTo(screenX, 0);
        p.lineTo(screenX, height);
      }
    }

    return p;
  });

  const smallTicksPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();

    const startSecond = Math.max(
      0,
      Math.floor((scroll - PLAYHEAD_OFFSET) / PIXELS_PER_SECOND)
    );
    const endSecond =
      Math.ceil((scroll + TIMELINE_WIDTH) / PIXELS_PER_SECOND) + 1;

    const shortTickHeight = height * 0.05;
    const mediumTickHeight = height * 0.1;

    for (let i = startSecond; i <= Math.min(endSecond, 120); i++) {
      for (let tenth = 1; tenth < 10; tenth++) {
        const time = i + tenth * 0.1;
        const worldX = PLAYHEAD_OFFSET + time * PIXELS_PER_SECOND;
        const screenX = worldX - scroll;

        if (screenX >= -10 && screenX <= TIMELINE_WIDTH + 10) {
          const isMidpoint = tenth === 5;
          const tickHeight = isMidpoint ? mediumTickHeight : shortTickHeight;

          p.moveTo(screenX, 0);
          p.lineTo(screenX, tickHeight);

          p.moveTo(screenX, height);
          p.lineTo(screenX, height - tickHeight);
        }
      }
    }

    return p;
  });

  return (
    <Group>
      <Path
        path={fullHeightPath}
        color={gridColor}
        style="stroke"
        strokeWidth={1}
      />
      <Path
        path={smallTicksPath}
        color={gridLightColor}
        style="stroke"
        opacity={0.5}
        strokeWidth={1}
      />
    </Group>
  );
}

function LaneSeparator({ y, color }: { y: number; color: string }) {
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, y);
    p.lineTo(TIMELINE_WIDTH, y);
    return p;
  });

  return <Path path={path} color={color} style="stroke" strokeWidth={1} />;
}

function ContinuousLines({
  segments,
  scrollX,
  intensityLaneTop,
  intensityLaneBottom,
  sharpnessLaneTop,
  sharpnessLaneBottom,
}: {
  segments: SharedValue<ContinuousSegment[]>;
  scrollX: SharedValue<number>;
  intensityLaneTop: number;
  intensityLaneBottom: number;
  sharpnessLaneTop: number;
  sharpnessLaneBottom: number;
}) {
  const intensityLaneHeight = intensityLaneBottom - intensityLaneTop;
  const sharpnessLaneHeight = sharpnessLaneBottom - sharpnessLaneTop;

  const intensityLinePath = useDerivedValue(() => {
    const allSegments = segments.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const segment of allSegments) {
      if (segment.endX - segment.startX < MIN_SEGMENT_WIDTH_FOR_LINE) continue;
      if (segment.points.length < 2) continue;

      let started = false;
      for (const pt of segment.points) {
        const screenX = pt.x - scroll;
        const y =
          intensityLaneBottom - pt.intensity * (intensityLaneHeight - 4) - 2;

        if (!started) {
          p.moveTo(screenX, y);
          started = true;
        } else {
          p.lineTo(screenX, y);
        }
      }
    }

    return p;
  });

  const sharpnessLinePath = useDerivedValue(() => {
    const allSegments = segments.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const segment of allSegments) {
      if (segment.endX - segment.startX < MIN_SEGMENT_WIDTH_FOR_LINE) continue;
      if (segment.points.length < 2) continue;

      let started = false;
      for (const pt of segment.points) {
        const screenX = pt.x - scroll;
        const y =
          sharpnessLaneBottom - pt.sharpness * (sharpnessLaneHeight - 4) - 2;

        if (!started) {
          p.moveTo(screenX, y);
          started = true;
        } else {
          p.lineTo(screenX, y);
        }
      }
    }

    return p;
  });

  const intensityDotsPath = useDerivedValue(() => {
    const allSegments = segments.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const segment of allSegments) {
      if (segment.endX - segment.startX >= MIN_SEGMENT_WIDTH_FOR_LINE) continue;
      if (segment.points.length === 0) continue;

      const pt = segment.points[0];
      if (!pt) continue;

      const screenX = pt.x - scroll;
      if (screenX < -20 || screenX > TIMELINE_WIDTH + 20) continue;

      const y =
        intensityLaneBottom - pt.intensity * (intensityLaneHeight - 4) - 2;
      p.addCircle(screenX, y, 3);
    }

    return p;
  });

  const sharpnessDotsPath = useDerivedValue(() => {
    const allSegments = segments.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const segment of allSegments) {
      if (segment.endX - segment.startX >= MIN_SEGMENT_WIDTH_FOR_LINE) continue;
      if (segment.points.length === 0) continue;

      const pt = segment.points[0];
      if (!pt) continue;

      const screenX = pt.x - scroll;
      if (screenX < -20 || screenX > TIMELINE_WIDTH + 20) continue;

      const y =
        sharpnessLaneBottom - pt.sharpness * (sharpnessLaneHeight - 4) - 2;
      p.addCircle(screenX, y, 3);
    }

    return p;
  });

  return (
    <Group>
      <Path
        path={intensityLinePath}
        color={INTENSITY_COLOR}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        strokeJoin="round"
      />
      <Path
        path={sharpnessLinePath}
        color={SHARPNESS_COLOR}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        strokeJoin="round"
      />
      <Path path={intensityDotsPath} color={INTENSITY_COLOR} style="fill" />
      <Path path={sharpnessDotsPath} color={SHARPNESS_COLOR} style="fill" />
    </Group>
  );
}

function TransientLines({
  transients,
  scrollX,
  intensityLaneTop,
  intensityLaneBottom,
  sharpnessLaneTop,
  sharpnessLaneBottom,
}: {
  transients: SharedValue<DataPoint[]>;
  scrollX: SharedValue<number>;
  intensityLaneTop: number;
  intensityLaneBottom: number;
  sharpnessLaneTop: number;
  sharpnessLaneBottom: number;
}) {
  const intensityLaneHeight = intensityLaneBottom - intensityLaneTop;
  const sharpnessLaneHeight = sharpnessLaneBottom - sharpnessLaneTop;

  const intensityPath = useDerivedValue(() => {
    const list = transients.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const t of list) {
      const screenX = t.x - scroll;
      if (screenX < -10 || screenX > TIMELINE_WIDTH + 10) continue;

      const lineHeight = Math.max(t.intensity * (intensityLaneHeight - 4), 4);
      const y1 = intensityLaneBottom - 2;
      const y2 = y1 - lineHeight;
      p.moveTo(screenX, y1);
      p.lineTo(screenX, y2);
    }

    return p;
  });

  const sharpnessPath = useDerivedValue(() => {
    const list = transients.get();
    const scroll = scrollX.get();
    const p = Skia.Path.Make();

    for (const t of list) {
      const screenX = t.x - scroll;
      if (screenX < -10 || screenX > TIMELINE_WIDTH + 10) continue;

      const lineHeight = Math.max(t.sharpness * (sharpnessLaneHeight - 4), 4);
      const y1 = sharpnessLaneBottom - 2;
      const y2 = y1 - lineHeight;
      p.moveTo(screenX, y1);
      p.lineTo(screenX, y2);
    }

    return p;
  });

  return (
    <Group>
      <Path
        path={intensityPath}
        color={TRANSIENT_INTENSITY_COLOR}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
      />
      <Path
        path={sharpnessPath}
        color={TRANSIENT_SHARPNESS_COLOR}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  canvas: {
    width: TIMELINE_WIDTH,
    height: '100%',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
