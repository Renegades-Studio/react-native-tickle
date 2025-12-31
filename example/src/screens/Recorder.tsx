import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue } from 'react-native-reanimated';
import MiniTransientPalette from '../components/MiniTransientPalette';
import MiniContinuousPalette from '../components/MiniContinuousPalette';
import RecordingTimeline from '../components/RecordingTimeline';
import RecordButton from '../components/RecordButton';
import RecordingsList from '../components/RecordingsList';
import ReText from '../components/ReText';
import { RecorderProvider, useRecorder } from '../contexts/RecorderContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PALETTE_SIZE = (SCREEN_WIDTH - 48) / 2;

const RecorderContent = () => {
  const insets = useSafeAreaInsets();

  const {
    isRecording,
    recordings,
    recordingDuration,
    recordedEvents,
    scrollPosition,
    frameCallback,
    startRecording,
    stopRecording,
    recordTransient,
    recordContinuousStart,
    recordContinuousUpdate,
    recordContinuousEnd,
    playRecording,
    deleteRecording,
  } = useRecorder();

  const handleRecordToggle = () => {
    if (isRecording.get()) {
      stopRecording();
      frameCallback.setActive(false);
    } else {
      frameCallback.setActive(true);
      startRecording();
    }
  };

  const handleTransientTrigger = (intensity: number, sharpness: number) => {
    'worklet';
    recordTransient(intensity, sharpness);
  };

  const handleContinuousStart = (intensity: number, sharpness: number) => {
    'worklet';
    recordContinuousStart(intensity, sharpness);
  };

  const handleContinuousUpdate = (intensity: number, sharpness: number) => {
    'worklet';
    recordContinuousUpdate(intensity, sharpness);
  };

  const handleContinuousEnd = () => {
    'worklet';
    recordContinuousEnd();
  };

  // Derived text for duration display
  const durationText = useDerivedValue(() => {
    if (!isRecording.get()) return '';
    return `${recordingDuration.get().toFixed(1)}s`;
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.title}>Haptic Recorder</Text>

      {/* Palettes */}
      <View style={styles.palettesContainer}>
        <View style={styles.paletteWrapper}>
          <Text style={styles.paletteLabel}>Continuous</Text>
          <MiniContinuousPalette
            size={PALETTE_SIZE}
            onContinuousStart={handleContinuousStart}
            onContinuousUpdate={handleContinuousUpdate}
            onContinuousEnd={handleContinuousEnd}
          />
        </View>

        <View style={styles.paletteWrapper}>
          <Text style={styles.paletteLabel}>Transient</Text>
          <MiniTransientPalette
            size={PALETTE_SIZE}
            onHapticTrigger={handleTransientTrigger}
          />
        </View>
      </View>

      {/* Timeline */}
      <RecordingTimeline
        isRecording={isRecording}
        duration={recordingDuration}
        events={recordedEvents}
        scrollPosition={scrollPosition}
      />

      {/* Recording duration */}
      <ReText text={durationText} style={styles.duration} />

      {/* Controls */}
      <RecordButton isRecording={isRecording} onPress={handleRecordToggle} />

      {/* Recordings List */}
      <RecordingsList
        recordings={recordings}
        onPlay={playRecording}
        onDelete={deleteRecording}
      />
    </View>
  );
};

export const Recorder = () => {
  return (
    <RecorderProvider>
      <RecorderContent />
    </RecorderProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  palettesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  paletteWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  paletteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 8,
    height: 24,
  },
});
