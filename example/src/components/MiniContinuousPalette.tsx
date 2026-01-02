import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  clamp,
  type SharedValue,
} from 'react-native-reanimated';
import {
  startContinuousPlayer,
  stopContinuousPlayer,
  updateContinuousPlayer,
} from 'react-native-ahaps';

const TOUCH_INDICATOR_SIZE = 30;
const INITIAL_INTENSITY = 1.0;
const INITIAL_SHARPNESS = 0.5;

interface MiniContinuousPaletteProps {
  size: number;
  resetTrigger?: SharedValue<number>;
  gestureActive?: SharedValue<boolean>;
  gestureIntensity?: SharedValue<number>;
  gestureSharpness?: SharedValue<number>;
  onContinuousStart?: (intensity: number, sharpness: number) => void;
  onContinuousUpdate?: (intensity: number, sharpness: number) => void;
  onContinuousEnd?: () => void;
}

const clipLocation = (x: number, y: number, size: number) => {
  'worklet';
  return {
    x: Math.max(0, Math.min(x, size)),
    y: Math.max(0, Math.min(y, size)),
  };
};

const normalizeCoordinates = (x: number, y: number, size: number) => {
  'worklet';
  return {
    x: x / size,
    y: y / size,
  };
};

export default function MiniContinuousPalette({
  size,
  resetTrigger,
  gestureActive,
  gestureIntensity,
  gestureSharpness,
  onContinuousStart,
  onContinuousUpdate,
  onContinuousEnd,
}: MiniContinuousPaletteProps) {
  const touchX = useSharedValue(size / 2);
  const touchY = useSharedValue(size / 2);
  const bgOpacity = useSharedValue(0);

  // Reset to center when trigger changes
  useAnimatedReaction(
    () => resetTrigger?.get() ?? 0,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        touchX.set(size / 2);
        touchY.set(size / 2);
        bgOpacity.set(0);
      }
    }
  );

  const updateHaptic = (x: number, y: number) => {
    'worklet';

    const normalized = normalizeCoordinates(x, y, size);
    const dynamicIntensity = 1 - normalized.y;
    const dynamicSharpness = normalized.x - 0.5;

    const perceivedIntensity = INITIAL_INTENSITY * dynamicIntensity;
    const perceivedSharpness = clamp(
      INITIAL_SHARPNESS + dynamicSharpness,
      0,
      1
    );

    updateContinuousPlayer(dynamicIntensity, dynamicSharpness);

    if (onContinuousUpdate) {
      onContinuousUpdate(perceivedIntensity, perceivedSharpness);
    }
  };

  const gesture = Gesture.Pan()
    .onBegin((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);
      bgOpacity.set(withTiming(1, { duration: 100 }));

      startContinuousPlayer();
      updateHaptic(clipped.x, clipped.y);

      const normalized = normalizeCoordinates(clipped.x, clipped.y, size);
      const intensity = INITIAL_INTENSITY * (1 - normalized.y);
      const sharpness = clamp(INITIAL_SHARPNESS + (normalized.x - 0.5), 0, 1);

      // Update gesture state shared values
      if (gestureActive) gestureActive.set(true);
      if (gestureIntensity) gestureIntensity.set(intensity);
      if (gestureSharpness) gestureSharpness.set(sharpness);

      if (onContinuousStart) {
        onContinuousStart(intensity, sharpness);
      }
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);

      updateHaptic(clipped.x, clipped.y);

      const normalized = normalizeCoordinates(clipped.x, clipped.y, size);
      const intensity = INITIAL_INTENSITY * (1 - normalized.y);
      const sharpness = clamp(INITIAL_SHARPNESS + (normalized.x - 0.5), 0, 1);

      // Update gesture state
      if (gestureIntensity) gestureIntensity.set(intensity);
      if (gestureSharpness) gestureSharpness.set(sharpness);

      if (onContinuousUpdate) {
        onContinuousUpdate(intensity, sharpness);
      }
    })
    .onEnd(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      stopContinuousPlayer();

      // Clear gesture state
      if (gestureActive) gestureActive.set(false);

      if (onContinuousEnd) {
        onContinuousEnd();
      }
    })
    .onFinalize(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      stopContinuousPlayer();

      // Clear gesture state
      if (gestureActive) gestureActive.set(false);

      if (onContinuousEnd) {
        onContinuousEnd();
      }
    });

  const touchStyle = useAnimatedStyle(() => {
    'worklet';
    const x = touchX.get() - TOUCH_INDICATOR_SIZE / 2;
    const y = touchY.get() - TOUCH_INDICATOR_SIZE / 2;
    return {
      transform: [{ translateX: x }, { translateY: y }] as const,
    };
  });

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.get(),
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.palette,
            { width: size, height: size, backgroundColor: '#3A3A3C' },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#48484A' },
              bgStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.touchIndicator,
              { backgroundColor: '#FF3B30' },
              touchStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  palette: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  touchIndicator: {
    position: 'absolute',
    width: TOUCH_INDICATOR_SIZE,
    height: TOUCH_INDICATOR_SIZE,
    borderRadius: TOUCH_INDICATOR_SIZE / 2,
  },
});
