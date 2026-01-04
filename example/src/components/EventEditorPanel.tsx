import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { SymbolView } from 'expo-symbols';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import type { ComposerEvent, ContinuousComposerEvent } from '../types/composer';
import PanInput from './PanInput';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

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
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        bottomOffset={20}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Type Segmented Control */}
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentHeader}>
            <SymbolView
              name={isTransient ? 'bolt.fill' : 'waveform'}
              size={18}
              tintColor={colors.blue}
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

        {/* Start Time and Duration in flex row */}
        <View style={styles.timeFieldsRow}>
          <View style={styles.timeFieldWrapper}>
            <PanInput
              label="Start Time"
              value={event.startTime}
              unit="sec"
              onValueChange={(value) => onUpdateEvent({ startTime: value })}
              colors={colors}
            />
          </View>
          {isContinuous && (
            <View style={styles.timeFieldWrapper}>
              <PanInput
                label="Duration"
                value={(event as ContinuousComposerEvent).duration}
                unit="sec"
                min={0.05}
                onValueChange={(value) => onUpdateEvent({ duration: value })}
                colors={colors}
              />
            </View>
          )}
        </View>

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

        {isContinuous && (
          <View style={styles.fadeSection}>
            <View style={styles.fadeSectionHeader}>
              <SymbolView
                name="chart.line.uptrend.xyaxis"
                size={16}
                tintColor={colors.blue}
              />
              <Text style={[styles.fadeSectionTitle, { color: colors.text }]}>
                Fade In
              </Text>
            </View>
            <View style={styles.fadeFieldsRow}>
              <View style={styles.fadeDurationWrapper}>
                <PanInput
                  label="Duration"
                  value={event.fadeInDuration}
                  unit="sec"
                  min={0}
                  max={event.duration / 2}
                  description={`How long the fade in takes\n`}
                  onValueChange={(value) =>
                    onUpdateEvent({ fadeInDuration: value })
                  }
                  colors={colors}
                />
              </View>
              <View style={styles.fadeSliderWrapper}>
                <SliderField
                  label="Smoothness"
                  value={1 - event.fadeInIntensity}
                  min={0}
                  max={1}
                  step={0.01}
                  displayValue={`${(1 - event.fadeInIntensity).toFixed(2)}`}
                  description="Higher smoothness starts from zero intensity"
                  onValueChange={(value) =>
                    onUpdateEvent({ fadeInIntensity: 1 - value })
                  }
                  colors={colors}
                />
              </View>
            </View>
          </View>
        )}

        {isContinuous && (
          <View style={styles.fadeSection}>
            <View style={styles.fadeSectionHeader}>
              <SymbolView
                name="chart.line.downtrend.xyaxis"
                size={16}
                tintColor={colors.blue}
              />
              <Text style={[styles.fadeSectionTitle, { color: colors.text }]}>
                Fade Out
              </Text>
            </View>
            <View style={styles.fadeFieldsRow}>
              <View style={styles.fadeDurationWrapper}>
                <PanInput
                  label="Duration"
                  value={(event as ContinuousComposerEvent).fadeOutDuration}
                  unit="sec"
                  min={0}
                  max={event.duration / 2}
                  description={`How long the fade out takes\n`}
                  onValueChange={(value) =>
                    onUpdateEvent({ fadeOutDuration: value })
                  }
                  colors={colors}
                />
              </View>
              <View style={styles.fadeSliderWrapper}>
                <SliderField
                  label="Smoothness"
                  value={1 - event.fadeOutIntensity}
                  min={0}
                  max={1}
                  step={0.01}
                  displayValue={`${(1 - event.fadeOutIntensity).toFixed(2)}`}
                  description="Higher smoothness ends at zero intensity"
                  onValueChange={(value) =>
                    onUpdateEvent({ fadeOutIntensity: 1 - value })
                  }
                  colors={colors}
                />
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
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
  timeFieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeFieldWrapper: {
    flex: 1,
  },
  fadeFieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fadeDurationWrapper: {
    flex: 1,
  },
  fadeSliderWrapper: {
    flex: 1,
  },
});
