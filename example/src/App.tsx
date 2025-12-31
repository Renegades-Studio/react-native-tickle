import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  useColorScheme,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  useDerivedValue,
} from 'react-native-reanimated';
import {
  useHapticEngine,
  AhapHybridObject,
  type HapticEvent,
  type HapticCurve,
} from 'react-native-ahap';
import { NitroModules } from 'react-native-nitro-modules';
import ReText from './ReText';
import {
  type AnimatedTimeoutID,
  clearAnimatedTimeout,
  setAnimatedTimeout,
} from './useAnimatedTimeout';
import {
  type AnimatedIntervalID,
  clearAnimatedInterval,
  setAnimatedInterval,
} from './useAnimatedInterval';

const boxedAhap = NitroModules.box(AhapHybridObject);

const runHaptic = (events: HapticEvent[], curves: HapticCurve[]) => {
  'worklet';
  boxedAhap.unbox().startHaptic(events, curves);
};

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MARGIN = 16;
const LABEL_HEIGHT = 24;
const TOUCH_INDICATOR_SIZE = 50;

// Calculate palette size
const totalWidth = SCREEN_WIDTH - 2 * MARGIN;
const totalHeight = SCREEN_HEIGHT - 80 - 4 * LABEL_HEIGHT - 2 * MARGIN;
const PALETTE_SIZE = Math.min(totalWidth, totalHeight / 2);

const INITIAL_INTENSITY = 1.0;
const INITIAL_SHARPNESS = 0.5;

export default function App() {
  useHapticEngine();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Shared values for haptic parameters
  const transientSharpness = useSharedValue(0.5);
  const transientIntensity = useSharedValue(0.5);
  const continuousSharpness = useSharedValue(0.5);
  const continuousIntensity = useSharedValue(0.5);

  // Timer ref for transient haptic repeat
  const transientTimerRef = useSharedValue<AnimatedTimeoutID>(-1);
  const transientIntervalRef = useSharedValue<AnimatedIntervalID>(-1);

  // Shared values for animations
  const transientTouchX = useSharedValue(PALETTE_SIZE / 2);
  const transientTouchY = useSharedValue(PALETTE_SIZE / 2);
  const transientTouchAlpha = useSharedValue(1);
  const transientBgOpacity = useSharedValue(0);

  const continuousTouchX = useSharedValue(PALETTE_SIZE / 2);
  const continuousTouchY = useSharedValue(PALETTE_SIZE / 2);
  const continuousTouchAlpha = useSharedValue(1);
  const continuousBgOpacity = useSharedValue(0);

  // Derived values for text labels
  const transientLabelText = useDerivedValue(() => {
    return `Sharpness ${transientSharpness.value.toFixed(
      2
    )}, Intensity ${transientIntensity.value.toFixed(2)}`;
  });

  const continuousLabelText = useDerivedValue(() => {
    return `Sharpness ${continuousSharpness.value.toFixed(
      2
    )}, Intensity ${continuousIntensity.value.toFixed(2)}`;
  });

  // Worklet helper functions
  const clipLocation = (x: number, y: number) => {
    'worklet';
    return {
      x: Math.max(0, Math.min(x, PALETTE_SIZE)),
      y: Math.max(0, Math.min(y, PALETTE_SIZE)),
    };
  };

  const normalizeCoordinates = (x: number, y: number) => {
    'worklet';
    return {
      x: x / PALETTE_SIZE,
      y: y / PALETTE_SIZE,
    };
  };

  const calculateSharpnessAndIntensity = (x: number, y: number) => {
    'worklet';
    const normalized = normalizeCoordinates(x, y);
    return {
      sharpness: normalized.x,
      intensity: 1 - normalized.y, // Inverted for iOS coordinate system
    };
  };

  // Transient haptic functions
  const playTransientHaptic = (intensity: number, sharpness: number) => {
    'worklet';
    if (Platform.OS !== 'ios') return;

    runHaptic(
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

  const flashTransientBackground = () => {
    'worklet';
    transientBgOpacity.value = withSequence(
      withTiming(1, { duration: 30 }),
      withTiming(0, { duration: 30 })
    );
  };

  // Worklet function to play transient and flash (called from timer via runOnUI)
  const playTransientFromCurrentPosition = () => {
    'worklet';
    const x = transientTouchX.value;
    const y = transientTouchY.value;
    const { sharpness, intensity } = calculateSharpnessAndIntensity(x, y);
    playTransientHaptic(intensity, sharpness);
    flashTransientBackground();
  };

  // JS function to trigger haptic from timer
  const triggerTransientHaptic = useCallback(() => {
    'worklet';
    playTransientFromCurrentPosition();
  }, []);

  // Start the repeating transient timer (called via runOnJS)
  const startTransientTimer = useCallback(() => {
    'worklet';
    // Clear any existing timers
    clearAnimatedTimeout(transientTimerRef.value);
    clearAnimatedInterval(transientIntervalRef.value);

    // After 750ms, start repeating every 600ms
    transientTimerRef.value = setAnimatedTimeout(() => {
      // Play first repeat
      triggerTransientHaptic();

      // Then continue every 600ms
      transientIntervalRef.value = setAnimatedInterval(() => {
        triggerTransientHaptic();
      }, 600);
    }, 750);
  }, [triggerTransientHaptic]);

  // Stop the transient timer (called via runOnJS)
  const stopTransientTimer = useCallback(() => {
    'worklet';
    clearAnimatedTimeout(transientTimerRef.value);
    transientTimerRef.value = -1;

    clearAnimatedInterval(transientIntervalRef.value);
    transientIntervalRef.value = -1;
  }, []);

  // Continuous haptic function - updates dynamic parameters
  const updateContinuousHaptic = (x: number, y: number) => {
    'worklet';
    if (Platform.OS !== 'ios') return;

    const normalized = normalizeCoordinates(x, y);
    // Dynamic intensity: 0 at bottom, 1 at top (control multiplies initial intensity)
    const dynamicIntensity = 1 - normalized.y;
    // Dynamic sharpness: -0.5 at left, +0.5 at right (control adds to initial sharpness)
    const dynamicSharpness = normalized.x - 0.5;

    // Calculate perceived values for display
    const perceivedIntensity = INITIAL_INTENSITY * dynamicIntensity;
    const perceivedSharpness = INITIAL_SHARPNESS + dynamicSharpness;

    // Update shared values for labels
    continuousSharpness.value = Math.max(0, Math.min(1, perceivedSharpness));
    continuousIntensity.value = perceivedIntensity;

    // Send dynamic parameters to the already-running continuous player
    updateContinuous(dynamicIntensity, dynamicSharpness);
  };

  // Transient Gesture
  const transientGesture = Gesture.Pan()
    .onBegin((event) => {
      const clipped = clipLocation(event.x, event.y);
      transientTouchX.value = clipped.x;
      transientTouchY.value = clipped.y;
      transientTouchAlpha.value = 1;

      const { sharpness, intensity } = calculateSharpnessAndIntensity(
        clipped.x,
        clipped.y
      );

      transientSharpness.value = sharpness;
      transientIntensity.value = intensity;

      // Play haptic immediately on touch
      playTransientHaptic(intensity, sharpness);
      flashTransientBackground();

      // Start the repeating timer
      startTransientTimer();
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y);
      transientTouchX.value = clipped.x;
      transientTouchY.value = clipped.y;

      const { sharpness, intensity } = calculateSharpnessAndIntensity(
        clipped.x,
        clipped.y
      );

      transientSharpness.value = sharpness;
      transientIntensity.value = intensity;
    })
    .onEnd(() => {
      // Stop the timer when gesture ends
      stopTransientTimer();
    })
    .onFinalize(() => {
      // Stop the timer when gesture is finalized
      stopTransientTimer();
    });

  // Continuous Gesture
  const continuousGesture = Gesture.Pan()
    .onBegin((event) => {
      const clipped = clipLocation(event.x, event.y);
      continuousTouchX.value = clipped.x;
      continuousTouchY.value = clipped.y;
      continuousTouchAlpha.value = 1;
      continuousBgOpacity.value = withTiming(1, { duration: 100 });

      // Start the continuous haptic player and set initial parameters
      startContinuous();
      updateContinuousHaptic(clipped.x, clipped.y);
    })
    .onUpdate((event) => {
      const clipped = clipLocation(event.x, event.y);
      continuousTouchX.value = clipped.x;
      continuousTouchY.value = clipped.y;

      // Update dynamic parameters while dragging
      updateContinuousHaptic(clipped.x, clipped.y);
    })
    .onEnd(() => {
      continuousBgOpacity.value = withTiming(0, { duration: 100 });
      // Stop the continuous haptic player
      stopContinuous();
    })
    .onFinalize(() => {
      continuousBgOpacity.value = withTiming(0, { duration: 100 });
      // Stop the continuous haptic player
      stopContinuous();
    });

  // Animated styles
  const transientTouchStyle = useAnimatedStyle(() => {
    'worklet';
    const x = transientTouchX.value - TOUCH_INDICATOR_SIZE / 2;
    const y = transientTouchY.value - TOUCH_INDICATOR_SIZE / 2;
    return {
      transform: [{ translateX: x }, { translateY: y }] as const,
      opacity: transientTouchAlpha.value,
    };
  });

  const transientBgStyle = useAnimatedStyle(() => ({
    opacity: transientBgOpacity.value * 0.3,
  }));

  const continuousTouchStyle = useAnimatedStyle(() => {
    'worklet';
    const x = continuousTouchX.value - TOUCH_INDICATOR_SIZE / 2;
    const y = continuousTouchY.value - TOUCH_INDICATOR_SIZE / 2;
    return {
      transform: [{ translateX: x }, { translateY: y }] as const,
      opacity: continuousTouchAlpha.value,
    };
  });

  const continuousBgStyle = useAnimatedStyle(() => ({
    opacity: continuousBgOpacity.value * 0.3,
  }));

  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    padColor: isDark ? '#3A3A3C' : '#D1D1D6',
    flashColor: isDark ? '#48484A' : '#C7C7CC',
    touchIndicator: '#F7A98A',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Continuous Palette (Top) */}
      <View style={styles.paletteContainer}>
        <Text style={[styles.titleLabel, { color: colors.text }]}>
          Continuous
        </Text>
        <GestureDetector gesture={continuousGesture}>
          <View style={[styles.palette, { backgroundColor: colors.padColor }]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.flashColor },
                continuousBgStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.touchIndicator,
                { backgroundColor: colors.touchIndicator },
                continuousTouchStyle,
              ]}
            />
          </View>
        </GestureDetector>
        <ReText
          text={continuousLabelText}
          style={[styles.valueLabel, { color: colors.text }]}
        />
      </View>

      {/* Transient Palette (Bottom) */}
      <View style={styles.paletteContainer}>
        <Text style={[styles.titleLabel, { color: colors.text }]}>
          Transient
        </Text>
        <GestureDetector gesture={transientGesture}>
          <View style={[styles.palette, { backgroundColor: colors.padColor }]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.flashColor },
                transientBgStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.touchIndicator,
                { backgroundColor: colors.touchIndicator },
                transientTouchStyle,
              ]}
            />
          </View>
        </GestureDetector>
        <ReText
          text={transientLabelText}
          style={[styles.valueLabel, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: MARGIN,
  },
  paletteContainer: {
    alignItems: 'center',
    marginBottom: MARGIN,
  },
  titleLabel: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  palette: {
    width: PALETTE_SIZE,
    height: PALETTE_SIZE,
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
  valueLabel: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
