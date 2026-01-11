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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { startHaptic } from '@renegades/react-native-tickle';
import type { ComposerEvent } from '../types/composer';
import { useTheme } from '../contexts/ThemeContext';
import { scheduleOnRN } from 'react-native-worklets';

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
  selectedEventId: string | null;
  currentTime: SharedValue<number>; // seconds
  totalDuration: SharedValue<number>; // seconds
  isPlaying: SharedValue<boolean>;
  scrollX: SharedValue<number>; // pixels - from context
  isUserScrolling: SharedValue<boolean>;
  onSelectEvent: (id: string | null) => void;
  onSeek: (timeSeconds: number) => void;
  onPause: () => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  height?: number;
}

export default function ComposerTimeline({
  events,
  selectedEventId,
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

    // Iterate in reverse to select top-most (last added) event first
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
      if (
        worldX >= eventStartX - tapPadding &&
        worldX <= eventEndX + tapPadding
      ) {
        onSelectEvent(event.id);
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
    scheduleOnRN(handleTap, event.x, scrollX.get());
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
                selectedEventId={selectedEventId}
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

    for (
      let i = startSecond;
      i <= Math.min(endSecond, MAX_DURATION_SECONDS);
      i++
    ) {
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

    for (
      let i = startSecond;
      i <= Math.min(endSecond, MAX_DURATION_SECONDS);
      i++
    ) {
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

// Corner radius for continuous shapes
const CONTINUOUS_CORNER_RADIUS = 4;

// Helper to build continuous event path with trapezoid-on-rectangle shape and rounded corners
function buildContinuousPath(
  p: ReturnType<typeof Skia.Path.Make>,
  screenX: number,
  width: number,
  barHeight: number,
  baseline: number,
  fadeInDuration: number,
  fadeOutDuration: number,
  fadeInIntensity: number,
  fadeOutIntensity: number,
  duration: number
) {
  'worklet';
  const r = Math.min(CONTINUOUS_CORNER_RADIUS, width / 4, barHeight / 4);

  const fadeInRatio = Math.min(fadeInDuration / duration, 0.5);
  const fadeOutRatio = Math.min(fadeOutDuration / duration, 0.5);
  const attackWidth = width * fadeInRatio;
  const decayWidth = width * fadeOutRatio;

  // Start height based on fadeInIntensity
  const startHeight = fadeInIntensity * barHeight;
  // End height based on fadeOutIntensity
  const endHeight = fadeOutIntensity * barHeight;

  const topY = baseline - barHeight;
  const leftX = screenX;
  const rightX = screenX + width;

  // For simple rectangular shapes (no fades), use RRect for proper rounded corners
  if (fadeInDuration === 0 && fadeOutDuration === 0) {
    p.addRRect(
      Skia.RRectXY(Skia.XYWHRect(leftX, topY, width, barHeight), r, r)
    );
    return;
  }

  // For complex shapes with fades, build path with rounded bottom corners
  // Start at bottom-left corner (after radius)
  p.moveTo(leftX + r, baseline);

  if (fadeInDuration > 0) {
    // Bottom-left corner arc
    p.arcToTangent(leftX, baseline, leftX, baseline - r, r);
    // Go up to start height
    const startY = baseline - startHeight;
    p.lineTo(leftX, startY);
    // Diagonal to full height at fadeInDuration position
    p.lineTo(leftX + attackWidth, topY);
  } else {
    // Bottom-left corner arc
    p.arcToTangent(leftX, baseline, leftX, baseline - r, r);
    // Straight up to top with rounded corner
    p.lineTo(leftX, topY + r);
    p.arcToTangent(leftX, topY, leftX + r, topY, r);
  }

  if (fadeOutDuration > 0) {
    // Horizontal to fadeOut start position
    p.lineTo(rightX - decayWidth, topY);
    // Diagonal down to end height
    const endY = baseline - endHeight;
    p.lineTo(rightX, endY);
  } else {
    // Top edge to right with rounded corner
    p.lineTo(rightX - r, topY);
    p.arcToTangent(rightX, topY, rightX, topY + r, r);
  }

  // Right side down to bottom
  p.lineTo(rightX, baseline - r);
  // Bottom-right corner arc
  p.arcToTangent(rightX, baseline, rightX - r, baseline, r);

  // Bottom edge back to start
  p.close();
}

// Individual transient event component with its own derived path
function TransientEventShape({
  startTime,
  intensity,
  sharpness,
  scrollX,
  eventAreaHeight,
  verticalPadding,
  isSelected,
}: {
  startTime: number;
  intensity: number;
  sharpness: number;
  scrollX: SharedValue<number>;
  eventAreaHeight: number;
  verticalPadding: number;
  isSelected: boolean;
}) {
  const baseline = verticalPadding + eventAreaHeight;
  const opacity = 0.3 + sharpness * 0.6;
  const barHeight = Math.max(intensity * eventAreaHeight, 8);

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + startTime * PIXELS_PER_SECOND - scroll;
    const y = baseline - barHeight;

    p.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          screenX - TRANSIENT_WIDTH / 2,
          y,
          TRANSIENT_WIDTH,
          barHeight
        ),
        2,
        2
      )
    );

    return p;
  });

  return (
    <Group>
      {isSelected && (
        <Path
          path={path}
          color={SELECTION_COLOR}
          style="stroke"
          strokeWidth={2}
        />
      )}
      <Path
        path={path}
        color={TRANSIENT_COLOR}
        style="fill"
        opacity={opacity}
      />
    </Group>
  );
}

// Individual continuous event component with its own derived path
function ContinuousEventShape({
  startTime,
  duration,
  intensity,
  sharpness,
  fadeInDuration,
  fadeOutDuration,
  fadeInIntensity,
  fadeOutIntensity,
  scrollX,
  eventAreaHeight,
  verticalPadding,
  isSelected,
}: {
  startTime: number;
  duration: number;
  intensity: number;
  sharpness: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  fadeInIntensity: number;
  fadeOutIntensity: number;
  scrollX: SharedValue<number>;
  eventAreaHeight: number;
  verticalPadding: number;
  isSelected: boolean;
}) {
  const baseline = verticalPadding + eventAreaHeight;
  const opacity = 0.3 + sharpness * 0.6;
  const width = Math.max(duration * PIXELS_PER_SECOND, 4);
  const barHeight = Math.max(intensity * eventAreaHeight, 8);

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const scroll = scrollX.get();
    const screenX = PLAYHEAD_OFFSET + startTime * PIXELS_PER_SECOND - scroll;

    buildContinuousPath(
      p,
      screenX,
      width,
      barHeight,
      baseline,
      fadeInDuration,
      fadeOutDuration,
      fadeInIntensity,
      fadeOutIntensity,
      duration
    );

    return p;
  });

  return (
    <Group>
      {isSelected && (
        <Path
          path={path}
          color={SELECTION_COLOR}
          style="stroke"
          strokeWidth={2}
        />
      )}
      <Path
        path={path}
        color={CONTINUOUS_COLOR}
        style="fill"
        opacity={opacity}
      />
    </Group>
  );
}

function EventShapes({
  events,
  selectedEventId,
  scrollX,
  eventAreaHeight,
  verticalPadding,
}: {
  events: ComposerEvent[];
  selectedEventId: string | null;
  scrollX: SharedValue<number>;
  eventAreaHeight: number;
  verticalPadding: number;
}) {
  return (
    <Group>
      {events.map((event) => {
        const isSelected = event.id === selectedEventId;

        if (event.type === 'transient') {
          return (
            <TransientEventShape
              key={event.id}
              startTime={event.startTime}
              intensity={event.intensity}
              sharpness={event.sharpness}
              scrollX={scrollX}
              eventAreaHeight={eventAreaHeight}
              verticalPadding={verticalPadding}
              isSelected={isSelected}
            />
          );
        } else {
          return (
            <ContinuousEventShape
              key={event.id}
              startTime={event.startTime}
              duration={event.duration}
              intensity={event.intensity}
              sharpness={event.sharpness}
              fadeInDuration={event.fadeInDuration}
              fadeOutDuration={event.fadeOutDuration}
              fadeInIntensity={event.fadeInIntensity}
              fadeOutIntensity={event.fadeOutIntensity}
              scrollX={scrollX}
              eventAreaHeight={eventAreaHeight}
              verticalPadding={verticalPadding}
              isSelected={isSelected}
            />
          );
        }
      })}
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
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
  },
});
