import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';
import Animated, {
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { startHaptic } from 'react-native-ahaps';
import type { ComposerEvent } from '../types/composer';
import { useTheme } from '../contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DEFAULT_HEIGHT = 160;

const TRANSIENT_COLOR = '#FF8C32';
const CONTINUOUS_COLOR = '#007AFF';
const SELECTION_COLOR = '#FF3B30';

export const TIMELINE_WIDTH = SCREEN_WIDTH - 32;
export const PIXELS_PER_SECOND = 100;
export const PLAYHEAD_OFFSET = TIMELINE_WIDTH / 2;

const MAX_DURATION_SECONDS = 120;
const MAX_CONTENT_WIDTH =
  PLAYHEAD_OFFSET + MAX_DURATION_SECONDS * PIXELS_PER_SECOND + PLAYHEAD_OFFSET;

const TRANSIENT_WIDTH = 6;
const EVENT_VERTICAL_PADDING = 10;

interface ComposerTimelineProps {
  events: ComposerEvent[];
  selectedEventIndex: number | null;
  currentTime: SharedValue<number>; // seconds
  totalDuration: SharedValue<number>; // seconds
  isPlaying: SharedValue<boolean>;
  scrollX: SharedValue<number>; // pixels - from context
  isUserScrolling: SharedValue<boolean>;
  onSelectEvent: (index: number | null) => void;
  onSeek: (timeSeconds: number) => void;
  onPause: () => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  height?: number;
}

export default function ComposerTimeline({
  events,
  selectedEventIndex,
  currentTime: _currentTime,
  totalDuration,
  isPlaying,
  scrollX,
  isUserScrolling,
  onSelectEvent,
  onSeek,
  onPause,
  onUserScrollStart,
  onUserScrollEnd,
  height = DEFAULT_HEIGHT,
}: ComposerTimelineProps) {
  void _currentTime; // currentTime is derived from scrollX during user scroll

  const { colors } = useTheme();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const isDragging = useSharedValue(false);
  const isMomentumScrolling = useSharedValue(false);
  const hittingMaxScroll = useSharedValue(false);
  const lastHapticMark = useSharedValue(-1);

  const eventAreaHeight = height - EVENT_VERTICAL_PADDING * 2;

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
      lastHapticMark.set(-1);

      // Snap scroll to current position
      scrollTo(scrollViewRef, scrollX.get(), 0, false);

      onUserScrollStart();
      if (isPlaying.get()) {
        onPause();
      }
    },

    onScroll: (event) => {
      const userScrolling = isDragging.get() || isMomentumScrolling.get();
      if (!userScrolling) return;

      const maxScroll = totalDuration.get() * PIXELS_PER_SECOND;
      const rawX = event.contentOffset.x;
      const clampedX = Math.min(Math.max(0, rawX), maxScroll);

      // Handle hitting max scroll
      if (clampedX !== rawX && !hittingMaxScroll.get()) {
        hittingMaxScroll.set(true);
        scrollTo(scrollViewRef, clampedX, 0, false);
      }
      if (clampedX === rawX) {
        hittingMaxScroll.set(false);
      }

      scrollX.set(clampedX);

      // Haptic feedback at timeline marks (100ms precision -> 0.1s)
      const currentTimeSeconds = clampedX / PIXELS_PER_SECOND;
      const currentMark = Math.floor(currentTimeSeconds * 10); // 0.1s precision
      const lastMark = lastHapticMark.get();

      if (currentMark !== lastMark) {
        lastHapticMark.set(currentMark);

        // Stronger haptic at full second marks
        if (currentMark % 10 === 0) {
          triggerHaptic(0.6, 0.8);
        } else {
          triggerHaptic(0.3, 0.7);
        }
      }

      // Seek to current position (in seconds)
      onSeek(clampedX / PIXELS_PER_SECOND);
    },

    onEndDrag: (event) => {
      isDragging.set(false);

      const maxScroll = totalDuration.get() * PIXELS_PER_SECOND;
      if (event.contentOffset.x > maxScroll) {
        scrollX.set(maxScroll);
        scrollTo(scrollViewRef, maxScroll, 0, true);
        onSeek(totalDuration.get());
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

      const maxScroll = totalDuration.get() * PIXELS_PER_SECOND;
      const currentScroll = scrollX.get();
      if (currentScroll > maxScroll) {
        scrollX.set(maxScroll);
        scrollTo(scrollViewRef, maxScroll, 0, true);
        onSeek(totalDuration.get());
      }

      if (isUserScrolling.get()) {
        onUserScrollEnd();
      }
    },
  });

  // Auto-scroll during playback (only when not user scrolling)
  useDerivedValue(() => {
    if (!isPlaying.get()) return;
    if (isDragging.get() || isMomentumScrolling.get()) return;
    if (isUserScrolling.get()) return;

    const targetScroll = scrollX.get();
    scrollTo(scrollViewRef, targetScroll, 0, false);
  });

  // Handle tap on events
  const handleTap = (x: number, scrollValue: number) => {
    const worldX = scrollValue + x;

    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (!event) continue;

      const eventStartX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND;
      let eventEndX: number;

      if (event.type === 'transient') {
        eventEndX = eventStartX + TRANSIENT_WIDTH;
      } else {
        eventEndX = eventStartX + event.duration * PIXELS_PER_SECOND;
      }

      const tapPadding = 15;
      if (worldX >= eventStartX - tapPadding && worldX <= eventEndX + tapPadding) {
        onSelectEvent(i);
        return;
      }
    }

    onSelectEvent(null);

    const time = (worldX - PLAYHEAD_OFFSET) / PIXELS_PER_SECOND;
    if (time >= 0) {
      onSeek(time);
    }
  };

  const tapGesture = Gesture.Tap().onEnd((event) => {
    runOnJS(handleTap)(event.x, scrollX.get());
  });

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: colors.timelineBackground },
      ]}
    >
      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={styles.canvas}>
            <Group>
              <GridLines
                height={height}
                scrollX={scrollX}
                gridColor={colors.timelineGrid}
                gridLightColor={colors.timelineGridLight}
              />
              <EventShapes
                events={events}
                selectedEventIndex={selectedEventIndex}
                scrollX={scrollX}
                eventAreaHeight={eventAreaHeight}
                verticalPadding={EVENT_VERTICAL_PADDING}
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
        </View>
      </GestureDetector>

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

    for (let i = startSecond; i <= Math.min(endSecond, MAX_DURATION_SECONDS); i++) {
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

    for (let i = startSecond; i <= Math.min(endSecond, MAX_DURATION_SECONDS); i++) {
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

function EventShapes({
  events,
  selectedEventIndex,
  scrollX,
  eventAreaHeight,
  verticalPadding,
}: {
  events: ComposerEvent[];
  selectedEventIndex: number | null;
  scrollX: SharedValue<number>;
  eventAreaHeight: number;
  verticalPadding: number;
}) {
  const transientPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event || event.type !== 'transient') continue;
      if (i === selectedEventIndex) continue;

      const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
      if (screenX < -20 || screenX > TIMELINE_WIDTH + 20) continue;

      const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
      const y = verticalPadding + eventAreaHeight - barHeight;

      p.addRRect(
        Skia.RRectXY(
          Skia.XYWHRect(screenX - TRANSIENT_WIDTH / 2, y, TRANSIENT_WIDTH, barHeight),
          2,
          2
        )
      );
    }

    return p;
  });

  const continuousPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event || event.type !== 'continuous') continue;
      if (i === selectedEventIndex) continue;
      if (event.fadeInDuration > 0 || event.fadeOutDuration > 0) continue;

      const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
      const width = Math.max(event.duration * PIXELS_PER_SECOND, 4);

      if (screenX + width < -20 || screenX > TIMELINE_WIDTH + 20) continue;

      const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
      const y = verticalPadding + eventAreaHeight - barHeight;

      p.addRRect(Skia.RRectXY(Skia.XYWHRect(screenX, y, width, barHeight), 4, 4));
    }

    return p;
  });

  const envelopePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event || event.type !== 'continuous') continue;
      if (i === selectedEventIndex) continue;
      if (event.fadeInDuration === 0 && event.fadeOutDuration === 0) continue;

      const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
      const width = Math.max(event.duration * PIXELS_PER_SECOND, 4);

      if (screenX + width < -20 || screenX > TIMELINE_WIDTH + 20) continue;

      const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
      const y = verticalPadding + eventAreaHeight - barHeight;

      const fadeInRatio = Math.min(event.fadeInDuration / event.duration, 0.5);
      const fadeOutRatio = Math.min(event.fadeOutDuration / event.duration, 0.5);
      const attackWidth = width * fadeInRatio;
      const decayWidth = width * fadeOutRatio;

      p.moveTo(screenX, y + barHeight);
      if (event.fadeInDuration > 0) {
        p.lineTo(screenX + attackWidth, y);
      } else {
        p.lineTo(screenX, y);
      }
      if (event.fadeOutDuration > 0) {
        p.lineTo(screenX + width - decayWidth, y);
      } else {
        p.lineTo(screenX + width, y);
      }
      p.lineTo(screenX + width, y + barHeight);
      p.close();
    }

    return p;
  });

  const selectedTransientPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (selectedEventIndex === null) return p;

    const event = events[selectedEventIndex];
    if (!event || event.type !== 'transient') return p;

    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
    const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
    const y = verticalPadding + eventAreaHeight - barHeight;

    p.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(screenX - TRANSIENT_WIDTH / 2, y, TRANSIENT_WIDTH, barHeight),
        2,
        2
      )
    );

    return p;
  });

  const selectedTransientBorderPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (selectedEventIndex === null) return p;

    const event = events[selectedEventIndex];
    if (!event || event.type !== 'transient') return p;

    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
    const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
    const y = verticalPadding + eventAreaHeight - barHeight;

    p.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          screenX - TRANSIENT_WIDTH / 2 - 3,
          y - 3,
          TRANSIENT_WIDTH + 6,
          barHeight + 6
        ),
        4,
        4
      )
    );

    return p;
  });

  const selectedContinuousPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (selectedEventIndex === null) return p;

    const event = events[selectedEventIndex];
    if (!event || event.type !== 'continuous') return p;
    if (event.fadeInDuration > 0 || event.fadeOutDuration > 0) return p;

    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
    const width = Math.max(event.duration * PIXELS_PER_SECOND, 4);
    const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
    const y = verticalPadding + eventAreaHeight - barHeight;

    p.addRRect(Skia.RRectXY(Skia.XYWHRect(screenX, y, width, barHeight), 4, 4));

    return p;
  });

  const selectedContinuousBorderPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (selectedEventIndex === null) return p;

    const event = events[selectedEventIndex];
    if (!event || event.type !== 'continuous') return p;

    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
    const width = Math.max(event.duration * PIXELS_PER_SECOND, 4);
    const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
    const y = verticalPadding + eventAreaHeight - barHeight;

    p.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(screenX - 3, y - 3, width + 6, barHeight + 6),
        6,
        6
      )
    );

    return p;
  });

  const selectedEnvelopePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (selectedEventIndex === null) return p;

    const event = events[selectedEventIndex];
    if (!event || event.type !== 'continuous') return p;
    if (event.fadeInDuration === 0 && event.fadeOutDuration === 0) return p;

    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + event.startTime * PIXELS_PER_SECOND - scroll;
    const width = Math.max(event.duration * PIXELS_PER_SECOND, 4);
    const barHeight = Math.max(event.intensity * eventAreaHeight, 8);
    const y = verticalPadding + eventAreaHeight - barHeight;

    const fadeInRatio = Math.min(event.fadeInDuration / event.duration, 0.5);
    const fadeOutRatio = Math.min(event.fadeOutDuration / event.duration, 0.5);
    const attackWidth = width * fadeInRatio;
    const decayWidth = width * fadeOutRatio;

    p.moveTo(screenX, y + barHeight);
    if (event.fadeInDuration > 0) {
      p.lineTo(screenX + attackWidth, y);
    } else {
      p.lineTo(screenX, y);
    }
    if (event.fadeOutDuration > 0) {
      p.lineTo(screenX + width - decayWidth, y);
    } else {
      p.lineTo(screenX + width, y);
    }
    p.lineTo(screenX + width, y + barHeight);
    p.close();

    return p;
  });

  return (
    <Group>
      <Path path={transientPath} color={TRANSIENT_COLOR} style="fill" opacity={0.8} />
      <Path path={continuousPath} color={CONTINUOUS_COLOR} style="fill" opacity={0.7} />
      <Path path={envelopePath} color={CONTINUOUS_COLOR} style="fill" opacity={0.7} />
      <Path
        path={selectedTransientBorderPath}
        color={SELECTION_COLOR}
        style="stroke"
        strokeWidth={2}
      />
      <Path path={selectedTransientPath} color={TRANSIENT_COLOR} style="fill" opacity={0.9} />
      <Path
        path={selectedContinuousBorderPath}
        color={SELECTION_COLOR}
        style="stroke"
        strokeWidth={2}
      />
      <Path path={selectedContinuousPath} color={CONTINUOUS_COLOR} style="fill" opacity={0.9} />
      <Path path={selectedEnvelopePath} color={CONTINUOUS_COLOR} style="fill" opacity={0.9} />
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
