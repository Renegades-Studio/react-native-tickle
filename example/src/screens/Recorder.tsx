import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue } from 'react-native-reanimated';
import MiniTransientPalette from '../components/MiniTransientPalette';
import MiniContinuousPalette from '../components/MiniContinuousPalette';
import RecordingTimeline from '../components/RecordingTimeline';
import RecordButton from '../components/RecordButton';
import RecordingsList from '../components/RecordingsList';
import ReText from '../components/ReText';
import { useRecorder } from '../contexts/RecorderContext';
import { useTheme } from '../contexts/ThemeContext';
import { scheduleOnRN } from 'react-native-worklets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PALETTE_SIZE = (SCREEN_WIDTH - 48) / 2;

function RecorderContent() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    mode,
    isRecording,
    recordingTime,
    recordingEvents,
    isPlaying,
    playbackTime,
    playbackEvents,
    playbackTotalDuration,
    scrollX,
    isUserScrolling,
    paletteResetTrigger,
    continuousGestureActive,
    continuousGestureIntensity,
    continuousGestureSharpness,
    recordings,
    selectedRecordingId,
    frameCallback,
    startRecording,
    stopRecording,
    recordTransient,
    recordContinuousStart,
    recordContinuousUpdate,
    recordContinuousEnd,
    selectRecording,
    startPlayback,
    stopPlayback,
    seekTo,
    onUserScrollStart,
    onUserScrollEnd,
    deleteRecording,
    renameRecording,
  } = useRecorder();

  const currentTime = useDerivedValue(() => {
    const m = mode.get();
    if (m === 'recording') return recordingTime.get();
    if (m === 'playback') return playbackTime.get();
    return 0;
  });

  const currentEvents = useDerivedValue(() => {
    const m = mode.get();
    if (m === 'recording') return recordingEvents.get();
    if (m === 'playback') return playbackEvents.get();
    return [];
  });

  const durationText = useDerivedValue(() => {
    const m = mode.get();
    if (m === 'recording') {
      return `${(recordingTime.get() / 1000).toFixed(1)}s`;
    }
    if (m === 'playback') {
      const current = playbackTime.get() / 1000;
      const total = playbackTotalDuration.get() / 1000;
      return `${current.toFixed(1)}s / ${total.toFixed(1)}s`;
    }
    return '';
  });

  const updateFrameCallbackState = (newState: boolean) => {
    frameCallback.setActive(newState);
  };

  const handleRecordToggle = () => {
    'worklet';
    if (isRecording.get()) {
      stopRecording();
      scheduleOnRN(updateFrameCallbackState, false);
    } else {
      scheduleOnRN(updateFrameCallbackState, true);
      startRecording();
    }
  };

  const handlePlayRecording = (id: string) => {
    if (selectedRecordingId !== id) {
      selectRecording(id);
    }
    frameCallback.setActive(true);
    startPlayback();
  };

  const handlePauseRecording = () => {
    stopPlayback();
    frameCallback.setActive(false);
  };

  const handleSeek = (time: number) => {
    'worklet';
    seekTo(time);
  };

  const handlePause = () => {
    'worklet';
    stopPlayback();
  };

  const handleUserScrollStart = () => {
    'worklet';
    onUserScrollStart();
  };

  const handleUserScrollEnd = () => {
    'worklet';
    onUserScrollEnd();
  };

  const handleTransient = (intensity: number, sharpness: number) => {
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Gesture Studio</Text>

      <View style={styles.palettes}>
        <View style={styles.paletteWrapper}>
          <Text style={[styles.paletteLabel, { color: colors.secondaryText }]}>
            Continuous
          </Text>
          <MiniContinuousPalette
            size={PALETTE_SIZE}
            resetTrigger={paletteResetTrigger}
            gestureActive={continuousGestureActive}
            gestureIntensity={continuousGestureIntensity}
            gestureSharpness={continuousGestureSharpness}
            onContinuousStart={handleContinuousStart}
            onContinuousUpdate={handleContinuousUpdate}
            onContinuousEnd={handleContinuousEnd}
          />
        </View>
        <View style={styles.paletteWrapper}>
          <Text style={[styles.paletteLabel, { color: colors.secondaryText }]}>
            Transient
          </Text>
          <MiniTransientPalette
            size={PALETTE_SIZE}
            resetTrigger={paletteResetTrigger}
            onHapticTrigger={handleTransient}
          />
        </View>
      </View>

      <RecordingTimeline
        mode={mode}
        isRecording={isRecording}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={playbackTotalDuration}
        events={currentEvents}
        scrollX={scrollX}
        isUserScrolling={isUserScrolling}
        onSeek={handleSeek}
        onPause={handlePause}
        onUserScrollStart={handleUserScrollStart}
        onUserScrollEnd={handleUserScrollEnd}
      />

      <ReText
        text={durationText}
        style={[styles.duration, { color: colors.accent }]}
      />

      <RecordButton isRecording={isRecording} onPress={handleRecordToggle} />

      <RecordingsList
        recordings={recordings}
        selectedId={selectedRecordingId}
        isPlaying={isPlaying}
        onSelect={selectRecording}
        onPlay={handlePlayRecording}
        onPause={handlePauseRecording}
        onDelete={deleteRecording}
        onNameChange={renameRecording}
      />
    </View>
  );
}

export function Recorder() {
  return <RecorderContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  palettes: {
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
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
    height: 24,
  },
});
