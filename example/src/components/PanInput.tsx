import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { ThemeColors } from '../contexts/ThemeContext';

interface PanInputProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
  colors: Pick<ThemeColors, 'text' | 'secondaryText' | 'blue' | 'timelineGrid'>;
}

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
  const [inputValue, setInputValue] = useState(value.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  const scale = useSharedValue(1);
  const startValue = useSharedValue(value);

  // Sync input value with prop when it changes externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toFixed(2));
    }
  }, [value, isEditing]);

  const handleEndEditing = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange(clamped);
      setInputValue(clamped.toFixed(2));
    } else {
      setInputValue(value.toFixed(2));
    }
    setIsEditing(false);
  };

  const updateValue = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    const stepped = Math.round(clamped / step) * step;
    onValueChange(stepped);
    setInputValue(stepped.toFixed(2));
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startValue.set(value);
      scale.set(withSpring(1.05, { damping: 15, stiffness: 300 }));
    })
    .onUpdate((event) => {
      // Negative translationY (pan up) should increase value
      const delta = -event.translationY * SENSITIVITY;
      const newValue = startValue.get() + delta;
      runOnJS(updateValue)(newValue);
    })
    .onEnd(() => {
      scale.set(withSpring(1, { damping: 15, stiffness: 300 }));
    })
    .onFinalize(() => {
      scale.set(withSpring(1, { damping: 15, stiffness: 300 }));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.inputContainer, animatedStyle]}>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.timelineGrid },
            ]}
            value={inputValue}
            onChangeText={(text) => {
              setIsEditing(true);
              setInputValue(text);
            }}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={[styles.unit, { color: colors.secondaryText }]}>
            {unit}
          </Text>
        </Animated.View>
      </GestureDetector>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    width: 20,
  },
});

