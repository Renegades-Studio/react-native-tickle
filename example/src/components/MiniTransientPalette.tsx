import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSequence,
  type SharedValue,
} from 'react-native-reanimated';
import { startHaptic } from 'react-native-ahap';

const TOUCH_INDICATOR_SIZE = 30;

interface MiniTransientPaletteProps {
  size: number;
  resetTrigger?: SharedValue<number>;
  onHapticTrigger?: (intensity: number, sharpness: number) => void;
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

const calculateSharpnessAndIntensity = (x: number, y: number, size: number) => {
  'worklet';
  const normalized = normalizeCoordinates(x, y, size);
  return {
    sharpness: normalized.x,
    intensity: 1 - normalized.y,
  };
};

export default function MiniTransientPalette({
  size,
  resetTrigger,
  onHapticTrigger,
}: MiniTransientPaletteProps) {
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
      }
    }
  );

  const playTransientHaptic = (
    intensityValue: number,
    sharpnessValue: number
  ) => {
    'worklet';

    startHaptic(
      [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: intensityValue },
            { type: 'sharpness', value: sharpnessValue },
          ],
        },
      ],
      []
    );
  };

  const flashBackground = () => {
    'worklet';
    bgOpacity.set(
      withSequence(
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: 30 })
      )
    );
  };

  const gesture = Gesture.Tap().onStart((event) => {
    const clipped = clipLocation(event.x, event.y, size);
    touchX.set(clipped.x);
    touchY.set(clipped.y);

    const { sharpness, intensity } = calculateSharpnessAndIntensity(
      clipped.x,
      clipped.y,
      size
    );

    playTransientHaptic(intensity, sharpness);
    flashBackground();

    if (onHapticTrigger) {
      onHapticTrigger(intensity, sharpness);
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
              { backgroundColor: '#007AFF' },
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
