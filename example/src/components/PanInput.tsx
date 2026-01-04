import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { ThemeColors } from '../contexts/ThemeContext';
import { scheduleOnRN } from 'react-native-worklets';

interface PanInputProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
  colors: Pick<ThemeColors, 'text' | 'secondaryText' | 'blue' | 'timelineGrid' | 'inputBackground' | 'knobTrack'>;
}

// Knob settings
const KNOB_MAX_TRAVEL = 8; // Maximum pixels the knob can move up or down
// Sensitivity: ~0.01 per 5px (fine control)
const SENSITIVITY = 0.01 / 5;

export default function PanInput({
  label,
  value,
  unit,
  min = 0,
  max = 999,
  step = 0.01,
  onValueChange,
  colors,
}: PanInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [initialValue] = useState(value);

  const knobTranslateY = useSharedValue(0);
  const startValue = useSharedValue(initialValue);

  const handleEndEditing = () => {
    const parsed = parseFloat(value.toFixed(2));
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange(clamped);
      inputRef.current?.setNativeProps({ text: clamped.toFixed(2) });
    } else {
      inputRef.current?.setNativeProps({ text: initialValue.toFixed(2) });
    }
  };

  const updateValue = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    const stepped = Math.round(clamped / step) * step;
    onValueChange(stepped);
    inputRef.current?.setNativeProps({ text: stepped.toFixed(2) });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startValue.set(value);
    })
    .onUpdate((event) => {
      // Clamp the knob visual translation to the max travel distance
      const clampedY = Math.max(
        -KNOB_MAX_TRAVEL,
        Math.min(KNOB_MAX_TRAVEL, event.translationY)
      );
      knobTranslateY.value = clampedY;

      // Negative translationY (pan up) should increase value
      const delta = -event.translationY * SENSITIVITY;
      const newValue = startValue.get() + delta;
      scheduleOnRN(updateValue, newValue);
    })
    .onEnd(() => {
      // Spring back to center
      knobTranslateY.value = withSpring(0, { damping: 90, stiffness: 1000 });
    })
    .onFinalize(() => {
      knobTranslateY.value = withSpring(0, { damping: 90, stiffness: 1000 });
    });

  const knobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: knobTranslateY.value }],
  }));

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {label}{' '}
          <Text style={[styles.unit, { color: colors.secondaryText }]}>
            {unit}
          </Text>
        </Text>
      </View>
      <View style={[styles.inputRow, { backgroundColor: colors.inputBackground }]}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.timelineGrid },
            ]}
            defaultValue={initialValue.toFixed(2)}
            onChangeText={(text) => {
              const parsed = parseFloat(text);
              if (!isNaN(parsed)) {
                onValueChange(parsed);
              }
            }}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <GestureDetector gesture={panGesture}>
          <View style={[styles.knobTrack, { backgroundColor: colors.knobTrack }]}>
            <Animated.View
              style={[
                styles.knob,
                { backgroundColor: colors.blue },
                knobAnimatedStyle,
              ]}
            />
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    width: 20,
  },
  knobTrack: {
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  knob: {
    width: 30,
    height: 9,
    borderRadius: 4,
  },
});
