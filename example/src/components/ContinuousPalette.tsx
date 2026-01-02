import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  clamp,
} from 'react-native-reanimated';
import { useContinuousPlayer } from 'react-native-ahaps';
import Header from './Header';
import Footer from './Footer';

const TOUCH_INDICATOR_SIZE = 50;
const INITIAL_INTENSITY = 1.0;
const INITIAL_SHARPNESS = 0.5;

const CONTINUOUS_PALETTE_PLAYER = 'continuous-palette';

interface ContinuousPaletteProps {
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

export default function ContinuousPalette({
  size,
  colors,
}: ContinuousPaletteProps) {
  const player = useContinuousPlayer(
    CONTINUOUS_PALETTE_PLAYER,
    INITIAL_INTENSITY,
    INITIAL_SHARPNESS
  );
  const sharpness = useSharedValue(0.5);
  const intensity = useSharedValue(0.5);
  const touchX = useSharedValue(size / 2);
  const touchY = useSharedValue(size / 2);
  const touchAlpha = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const labelText = useDerivedValue(() => {
    return `Sharpness ${sharpness.get().toFixed(2)}, Intensity ${intensity
      .get()
      .toFixed(2)}`;
  });

  const updateHaptic = (x: number, y: number) => {
    'worklet';

    const normalized = normalizeCoordinates(x, y, size);
    const dynamicIntensity = 1 - normalized.y;
    const dynamicSharpness = normalized.x - 0.5;

    const perceivedIntensity = INITIAL_INTENSITY * dynamicIntensity;
    const perceivedSharpness = INITIAL_SHARPNESS + dynamicSharpness;

    sharpness.set(clamp(perceivedSharpness, 0, 1));
    intensity.set(perceivedIntensity);

    player.update(dynamicIntensity, dynamicSharpness);
  };

  const gesture = Gesture.Pan()
    .onBegin((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);
      touchAlpha.set(1);
      bgOpacity.set(withTiming(1, { duration: 100 }));

      player.start();
      updateHaptic(clipped.x, clipped.y);
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);

      updateHaptic(clipped.x, clipped.y);
    })
    .onEnd(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      player.stop();
    })
    .onFinalize(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      player.stop();
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
      <Header title="Continuous" color={colors.text} />
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
