import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import MiniTransientPalette from '../components/MiniTransientPalette';
import MiniContinuousPalette from '../components/MiniContinuousPalette';
import RecordingTimeline from '../components/RecordingTimeline';
import RecordButton from '../components/RecordButton';
import RecordingsList from '../components/RecordingsList';
import ReText from '../components/ReText';
import { RecorderProvider, useRecorder } from '../contexts/RecorderContext';
import { scheduleOnRN } from 'react-native-worklets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PALETTE_SIZE = (SCREEN_WIDTH - 48) / 2;

function RecorderContent() {
  const insets = useSafeAreaInsets();
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
  } = useRecorder();

  // Track playing state for list UI
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying.get() && selectedRecordingId) {
        setPlayingId(selectedRecordingId);
      } else {
        setPlayingId(null);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, selectedRecordingId]);

  // Current time and events based on mode
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

  // Duration text
  const durationText = useDerivedValue(() => {
    const m = mode.get();
    if (m === 'recording') {
      return `${recordingTime.get().toFixed(1)}s`;
    }
    if (m === 'playback') {
      const current = playbackTime.get();
      const total = playbackTotalDuration.get();
      return `${current.toFixed(1)}s / ${total.toFixed(1)}s`;
    }
    return '';
  });

  const updateFrameCallbackState = (newState: boolean) => {
    frameCallback.setActive(newState);
  };

  // Handlers
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
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Haptic Recorder</Text>

      {/* Palettes */}
      <View style={styles.palettes}>
        <View style={styles.paletteWrapper}>
          <Text style={styles.paletteLabel}>Continuous</Text>
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
          <Text style={styles.paletteLabel}>Transient</Text>
          <MiniTransientPalette
            size={PALETTE_SIZE}
            resetTrigger={paletteResetTrigger}
            onHapticTrigger={handleTransient}
          />
        </View>
      </View>

      {/* Timeline */}
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

      {/* Duration */}
      <ReText text={durationText} style={styles.duration} />

      {/* Record button */}
      <RecordButton isRecording={isRecording} onPress={handleRecordToggle} />

      {/* Recordings list */}
      <RecordingsList
        recordings={recordings}
        selectedId={selectedRecordingId}
        playingId={playingId}
        onSelect={selectRecording}
        onPlay={handlePlayRecording}
        onPause={handlePauseRecording}
        onDelete={deleteRecording}
      />
    </View>
  );
}

export function Recorder() {
  return (
    <RecorderProvider>
      <RecorderContent />
    </RecorderProvider>
  );
}

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
