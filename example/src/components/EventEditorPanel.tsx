import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import type { ComposerEvent, ContinuousComposerEvent } from '../types/composer';

interface EventEditorPanelProps {
  event: ComposerEvent | null;
  onUpdateEvent: (updates: Partial<ComposerEvent>) => void;
  onChangeType: (type: 'transient' | 'continuous') => void;
  onClose: () => void;
}

export default function EventEditorPanel({
  event,
  onUpdateEvent,
  onChangeType,
}: EventEditorPanelProps) {
  const { colors } = useTheme();

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            Select an event to edit or add a new one
          </Text>
        </View>
      </View>
    );
  }

  const isTransient = event.type === 'transient';
  const isContinuous = event.type === 'continuous';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Type Segmented Control */}
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentHeader}>
            <Ionicons
              name={isTransient ? 'flash' : 'pulse'}
              size={18}
              color={colors.blue}
            />
            <Text style={[styles.segmentHeaderText, { color: colors.text }]}>
              Event Type
            </Text>
          </View>
          <SegmentedControl
            values={['Transient', 'Continuous']}
            selectedIndex={isTransient ? 0 : 1}
            onChange={(e) => {
              const index = e.nativeEvent.selectedSegmentIndex;
              onChangeType(index === 0 ? 'transient' : 'continuous');
            }}
            style={styles.segmentedControl}
            tintColor={colors.blue}
            fontStyle={{ fontSize: 14, fontWeight: '500' }}
            activeFontStyle={{
              fontSize: 14,
              fontWeight: '600',
              color: '#FFFFFF',
            }}
          />
        </View>

        {/* Start Time */}
        <TimeInputField
          label="Start Time"
          value={event.startTime}
          unit="s"
          onValueChange={(value) => onUpdateEvent({ startTime: value })}
          colors={colors}
        />

        {/* Duration (Continuous only) */}
        {isContinuous && (
          <TimeInputField
            label="Duration"
            value={(event as ContinuousComposerEvent).duration}
            unit="s"
            min={0.05}
            onValueChange={(value) => onUpdateEvent({ duration: value })}
            colors={colors}
          />
        )}

        {/* Intensity */}
        <SliderField
          label="Intensity"
          value={event.intensity}
          min={0}
          max={1}
          step={0.01}
          displayValue={`${event.intensity.toFixed(2)}`}
          description="Control the strength of the haptic"
          onValueChange={(value) => onUpdateEvent({ intensity: value })}
          colors={colors}
        />

        {/* Sharpness */}
        <SliderField
          label="Sharpness"
          value={event.sharpness}
          min={0}
          max={1}
          step={0.01}
          displayValue={`${event.sharpness.toFixed(2)}`}
          description="Control the feeling from dull to sharp"
          onValueChange={(value) => onUpdateEvent({ sharpness: value })}
          colors={colors}
        />

        {/* Fade In Section (Continuous only) */}
        {isContinuous && (
          <View style={styles.fadeSection}>
            <View style={styles.fadeSectionHeader}>
              <Ionicons name="trending-up" size={16} color={colors.blue} />
              <Text style={[styles.fadeSectionTitle, { color: colors.text }]}>
                Fade In
              </Text>
            </View>
            <SliderField
              label="Start Intensity"
              value={(event as ContinuousComposerEvent).fadeInIntensity}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(
                event as ContinuousComposerEvent
              ).fadeInIntensity.toFixed(2)}`}
              description="Starting intensity (ramps from this value to full intensity)"
              onValueChange={(value) =>
                onUpdateEvent({ fadeInIntensity: value })
              }
              colors={colors}
            />
            <TimeInputField
              label="Duration"
              value={(event as ContinuousComposerEvent).fadeInDuration}
              unit="s"
              onValueChange={(value) =>
                onUpdateEvent({ fadeInDuration: value })
              }
              colors={colors}
            />
          </View>
        )}

        {/* Fade Out Section (Continuous only) */}
        {isContinuous && (
          <View style={styles.fadeSection}>
            <View style={styles.fadeSectionHeader}>
              <Ionicons name="trending-down" size={16} color={colors.blue} />
              <Text style={[styles.fadeSectionTitle, { color: colors.text }]}>
                Fade Out
              </Text>
            </View>
            <SliderField
              label="End Intensity"
              value={(event as ContinuousComposerEvent).fadeOutIntensity}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(
                event as ContinuousComposerEvent
              ).fadeOutIntensity.toFixed(2)}`}
              description="Ending intensity (ramps from full intensity to this value)"
              onValueChange={(value) =>
                onUpdateEvent({ fadeOutIntensity: value })
              }
              colors={colors}
            />
            <TimeInputField
              label="Duration"
              value={(event as ContinuousComposerEvent).fadeOutDuration}
              unit="s"
              onValueChange={(value) =>
                onUpdateEvent({ fadeOutDuration: value })
              }
              colors={colors}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Reusable slider field component
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  description?: string;
  onValueChange: (value: number) => void;
  colors: Pick<ThemeColors, 'text' | 'secondaryText' | 'blue' | 'timelineGrid'>;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  description,
  onValueChange,
  colors,
}: SliderFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]}>
          {displayValue}
        </Text>
      </View>
      {description && (
        <Text
          style={[styles.fieldDescription, { color: colors.secondaryText }]}
        >
          {description}
        </Text>
      )}
      <Slider
        style={styles.slider}
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.blue}
        maximumTrackTintColor={colors.timelineGrid}
        thumbTintColor="#FFFFFF"
      />
    </View>
  );
}

// Time input field component with TextInput
interface TimeInputFieldProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  colors: Pick<ThemeColors, 'text' | 'secondaryText' | 'blue' | 'timelineGrid'>;
}

function TimeInputField({
  label,
  value,
  unit,
  min = 0,
  max = 999,
  onValueChange,
  colors,
}: TimeInputFieldProps) {
  const [inputValue, setInputValue] = useState(value.toFixed(2));

  // Sync input value with prop when it changes externally
  useEffect(() => {
    setInputValue(value.toFixed(2));
  }, [value]);

  const handleEndEditing = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange(clamped);
      setInputValue(clamped.toFixed(2));
    } else {
      setInputValue(value.toFixed(2));
    }
  }, [inputValue, min, max, onValueChange, value]);

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.timeInputContainer}>
        <TextInput
          style={[
            styles.timeInput,
            { color: colors.text, borderColor: colors.timelineGrid },
          ]}
          value={inputValue}
          onChangeText={setInputValue}
          onEndEditing={handleEndEditing}
          onBlur={handleEndEditing}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Text style={[styles.timeInputUnit, { color: colors.secondaryText }]}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for action bar
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  segmentedControlContainer: {
    marginBottom: 24,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  segmentHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  segmentedControl: {
    height: 36,
  },
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
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  fieldDescription: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  timeInputUnit: {
    fontSize: 14,
    fontWeight: '500',
    width: 20,
  },
  fadeSection: {
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.3)',
  },
  fadeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  fadeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
