import { View, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  clamp,
} from 'react-native-reanimated';
import { NitroModules } from 'react-native-nitro-modules';
import { AhapHybridObject } from 'react-native-ahap';

const boxedAhap = NitroModules.box(AhapHybridObject);

const TOUCH_INDICATOR_SIZE = 30;
const INITIAL_INTENSITY = 1.0;
const INITIAL_SHARPNESS = 0.5;

interface MiniContinuousPaletteProps {
  size: number;
  onContinuousStart?: (intensity: number, sharpness: number) => void;
  onContinuousUpdate?: (intensity: number, sharpness: number) => void;
  onContinuousEnd?: () => void;
}

const startContinuous = () => {
  'worklet';
  boxedAhap.unbox().startContinuousPlayer();
};

const updateContinuous = (
  intensityControl: number,
  sharpnessControl: number
) => {
  'worklet';
  boxedAhap.unbox().updateContinuousPlayer(intensityControl, sharpnessControl);
};

const stopContinuous = () => {
  'worklet';
  boxedAhap.unbox().stopContinuousPlayer();
};

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
  onContinuousStart,
  onContinuousUpdate,
  onContinuousEnd,
}: MiniContinuousPaletteProps) {
  const touchX = useSharedValue(size / 2);
  const touchY = useSharedValue(size / 2);
  const bgOpacity = useSharedValue(0);

  const updateHaptic = (x: number, y: number) => {
    'worklet';
    if (Platform.OS !== 'ios') return;

    const normalized = normalizeCoordinates(x, y, size);
    const dynamicIntensity = 1 - normalized.y;
    const dynamicSharpness = normalized.x - 0.5;

    const perceivedIntensity = INITIAL_INTENSITY * dynamicIntensity;
    const perceivedSharpness = clamp(
      INITIAL_SHARPNESS + dynamicSharpness,
      0,
      1
    );

    updateContinuous(dynamicIntensity, dynamicSharpness);

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

      startContinuous();
      updateHaptic(clipped.x, clipped.y);

      if (onContinuousStart) {
        const normalized = normalizeCoordinates(clipped.x, clipped.y, size);
        const intensity = INITIAL_INTENSITY * (1 - normalized.y);
        const sharpness = clamp(INITIAL_SHARPNESS + (normalized.x - 0.5), 0, 1);
        onContinuousStart(intensity, sharpness);
      }
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y, size);
      touchX.set(clipped.x);
      touchY.set(clipped.y);

      updateHaptic(clipped.x, clipped.y);
    })
    .onEnd(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      stopContinuous();
      if (onContinuousEnd) {
        onContinuousEnd();
      }
    })
    .onFinalize(() => {
      bgOpacity.set(withTiming(0, { duration: 100 }));
      stopContinuous();
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
