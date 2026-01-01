import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  useDerivedValue,
} from 'react-native-reanimated';
import { startHaptic } from 'react-native-ahap';
import type { AnimatedTimeoutID } from '../hooks/useAnimatedTimeout';
import type { AnimatedIntervalID } from '../hooks/useAnimatedInterval';
import {
  setAnimatedTimeout,
  clearAnimatedTimeout,
} from '../hooks/useAnimatedTimeout';
import {
  setAnimatedInterval,
  clearAnimatedInterval,
} from '../hooks/useAnimatedInterval';
import Header from './Header';
import Footer from './Footer';

const TOUCH_INDICATOR_SIZE = 50;

interface TransientPaletteProps {
  size: number;
  colors: {
    text: string;
    padColor: string;
    flashColor: string;
    touchIndicator: string;
  };
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

export default function TransientPalette({
  size,
  colors,
}: TransientPaletteProps) {
  const sharpness = useSharedValue(0.5);
  const intensity = useSharedValue(0.5);
  const touchX = useSharedValue(size / 2);
  const touchY = useSharedValue(size / 2);
  const touchAlpha = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const timerRef = useSharedValue<AnimatedTimeoutID>(-1);
  const intervalRef = useSharedValue<AnimatedIntervalID>(-1);

  const labelText = useDerivedValue(() => {
    return `Sharpness ${sharpness.get().toFixed(2)}, Intensity ${intensity
      .get()
      .toFixed(2)}`;
  });

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

  const playFromCurrentPosition = () => {
    'worklet';
    const x = touchX.get();
    const y = touchY.get();
    const { sharpness: s, intensity: i } = calculateSharpnessAndIntensity(
      x,
      y,
      size
    );
    playTransientHaptic(i, s);
    flashBackground();
  };

  const startTimer = () => {
    'worklet';
    clearAnimatedTimeout(timerRef.get());
    clearAnimatedInterval(intervalRef.get());

    timerRef.set(
      setAnimatedTimeout(() => {
        playFromCurrentPosition();

        intervalRef.set(
          setAnimatedInterval(() => {
            playFromCurrentPosition();
          }, 600)
        );
      }, 750)
    );
  };

  const stopTimer = () => {
    'worklet';
    clearAnimatedTimeout(timerRef.get());
    timerRef.set(-1);
    clearAnimatedInterval(intervalRef.get());
    intervalRef.set(-1);
  };

  const gesture = Gesture.Pan()
    .onBegin((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);
      touchAlpha.set(1);

      const { sharpness: s, intensity: i } = calculateSharpnessAndIntensity(
        clipped.x,
        clipped.y,
        size
      );

      sharpness.set(s);
      intensity.set(i);

      playTransientHaptic(i, s);
      flashBackground();
      startTimer();
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);

      const { sharpness: s, intensity: i } = calculateSharpnessAndIntensity(
        clipped.x,
        clipped.y,
        size
      );

      sharpness.set(s);
      intensity.set(i);
    })
    .onEnd(() => {
      stopTimer();
    })
    .onFinalize(() => {
      stopTimer();
    });

  const touchStyle = useAnimatedStyle(() => {
    'worklet';
    const x = touchX.get() - TOUCH_INDICATOR_SIZE / 2;
    const y = touchY.get() - TOUCH_INDICATOR_SIZE / 2;
    return {
      transform: [{ translateX: x }, { translateY: y }] as const,
      opacity: touchAlpha.get(),
    };
  });

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.get(),
  }));

  return (
    <View style={styles.container}>
      <Header title="Transient" color={colors.text} />
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.palette,
            { width: size, height: size, backgroundColor: colors.padColor },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.flashColor },
              bgStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.touchIndicator,
              { backgroundColor: colors.touchIndicator },
              touchStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <Footer text={labelText} color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  palette: {
    borderRadius: 16,
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
