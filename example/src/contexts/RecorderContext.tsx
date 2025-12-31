import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  useSharedValue,
  useFrameCallback,
  type SharedValue,
  type FrameCallback,
} from 'react-native-reanimated';
import { NitroModules } from 'react-native-nitro-modules';
import type { RecordedHaptic, RecordingEvent } from '../types/recording';
import type { HapticEvent, HapticCurve } from 'react-native-ahap';
import {
  startHaptic,
  stopAllHaptics,
  AhapHybridObject,
} from 'react-native-ahap';
import {
  trimHapticDataFromSeekTime,
  hapticEventsToRecordingEvents,
} from '../utils/hapticPlayback';
import { PIXELS_PER_SECOND } from '../components/RecordingTimeline';
import { scheduleOnRN } from 'react-native-worklets';

const boxedAhap = NitroModules.box(AhapHybridObject);

const stopContinuousPlayerWorklet = () => {
  'worklet';
  boxedAhap.unbox().stopContinuousPlayer();
};

type TimelineMode = 'recording' | 'playback' | 'idle';

interface RecorderContextValue {
  mode: SharedValue<TimelineMode>;
  isRecording: SharedValue<boolean>;
  recordingTime: SharedValue<number>;
  recordingEvents: SharedValue<RecordingEvent[]>;
  isPlaying: SharedValue<boolean>;
  playbackTime: SharedValue<number>;
  playbackEvents: SharedValue<RecordingEvent[]>;
  playbackTotalDuration: SharedValue<number>;
  scrollX: SharedValue<number>;
  isUserScrolling: SharedValue<boolean>;
  paletteResetTrigger: SharedValue<number>;
  // Continuous gesture state - written by palette, read by startRecording
  continuousGestureActive: SharedValue<boolean>;
  continuousGestureIntensity: SharedValue<number>;
  continuousGestureSharpness: SharedValue<number>;
  recordings: RecordedHaptic[];
  selectedRecordingId: string | null;
  frameCallback: FrameCallback;
  startRecording: () => void;
  stopRecording: () => void;
  recordTransient: (intensity: number, sharpness: number) => void;
  recordContinuousStart: (intensity: number, sharpness: number) => void;
  recordContinuousUpdate: (intensity: number, sharpness: number) => void;
  recordContinuousEnd: () => void;
  selectRecording: (id: string | null) => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  seekTo: (time: number) => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  deleteRecording: (id: string) => void;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function RecorderProvider({ children }: { children: ReactNode }) {
  const [recordings, setRecordings] = useState<RecordedHaptic[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
    null
  );

  const mode = useSharedValue<TimelineMode>('idle');

  // Recording state
  const isRecording = useSharedValue(false);
  const recordingStartTimestamp = useSharedValue(0);
  const recordingTime = useSharedValue(0);
  const recordingEvents = useSharedValue<RecordingEvent[]>([]);
  const continuousActive = useSharedValue(false);
  const lastContinuousUpdateTime = useSharedValue(0);

  const CONTINUOUS_UPDATE_THROTTLE_MS = 16;

  // Playback state
  const isPlaying = useSharedValue(false);
  const playbackStartTimestamp = useSharedValue(0);
  const playbackStartTime = useSharedValue(0);
  const playbackTime = useSharedValue(0);
  const playbackEvents = useSharedValue<RecordingEvent[]>([]);
  const playbackTotalDuration = useSharedValue(0);

  // Scroll control
  const scrollX = useSharedValue(0);
  const isUserScrolling = useSharedValue(false);

  // Palette reset trigger - increment to trigger reset
  const paletteResetTrigger = useSharedValue(0);

  // Continuous gesture state - written by palette, read by startRecording
  const continuousGestureActive = useSharedValue(false);
  const continuousGestureIntensity = useSharedValue(0.5);
  const continuousGestureSharpness = useSharedValue(0.5);

  // Frame callback
  const frameCallback = useFrameCallback(() => {
    const now = Date.now();

    if (mode.get() === 'recording' && isRecording.get()) {
      const elapsed = (now - recordingStartTimestamp.get()) / 1000;
      recordingTime.set(elapsed);
      scrollX.set(elapsed * PIXELS_PER_SECOND);
    } else if (mode.get() === 'playback' && isPlaying.get()) {
      const elapsed = (now - playbackStartTimestamp.get()) / 1000;
      const newTime = playbackStartTime.get() + elapsed;
      const maxTime = playbackTotalDuration.get();

      if (newTime >= maxTime) {
        playbackTime.set(maxTime);
        isPlaying.set(false);
        scrollX.set(maxTime * PIXELS_PER_SECOND);
      } else {
        playbackTime.set(newTime);
        scrollX.set(newTime * PIXELS_PER_SECOND);
      }
    }
  }, false);

  // === Recording ===

  const startRecording = () => {
    'worklet';
    scheduleOnRN(setSelectedRecordingId, null);

    mode.set('recording');
    isRecording.set(true);
    recordingStartTimestamp.set(Date.now());
    recordingTime.set(0);
    scrollX.set(0);

    isPlaying.set(false);
    playbackTime.set(0);
    playbackEvents.set([]);

    // Check if continuous gesture is already active - if so, immediately start recording it
    if (continuousGestureActive.get()) {
      const intensity = continuousGestureIntensity.get();
      const sharpness = continuousGestureSharpness.get();
      continuousActive.set(true);
      recordingEvents.set([
        { type: 'continuous_start', timestamp: 0, intensity, sharpness },
      ]);
    } else {
      recordingEvents.set([]);
      continuousActive.set(false);
    }

    // Don't reset palette indicators if gesture is active
    if (!continuousGestureActive.get()) {
      paletteResetTrigger.set(paletteResetTrigger.get() + 1);
    }
  };

  const addRecordingAndSelect = (recording: RecordedHaptic) => {
    setRecordings((prev) => [...prev, recording]);
    setSelectedRecordingId(recording.id);
  };

  const stopRecording = () => {
    'worklet';
    // Get timestamp and check continuous state BEFORE setting isRecording to false
    const timestamp = recordingTime.get();
    const wasContinuousActive = continuousActive.get();

    isRecording.set(false);

    // Stop continuous haptic if active
    if (wasContinuousActive) {
      stopContinuousPlayerWorklet();
    }

    let events = recordingEvents.get();

    // Close any open continuous block
    if (wasContinuousActive) {
      events = [
        ...events,
        {
          type: 'continuous_end' as const,
          timestamp,
          intensity: 0,
          sharpness: 0,
        },
      ];
      recordingEvents.set(events);
      continuousActive.set(false);
    }

    const duration = timestamp;
    const { events: hapticEvents, curves: hapticCurves } =
      convertToHapticData(events);

    const newId = Date.now().toString();
    const count = recordings.length + 1;
    const newRecording: RecordedHaptic = {
      id: newId,
      name: `Recording ${count}`,
      createdAt: Date.now(),
      duration,
      events: hapticEvents,
      curves: hapticCurves,
    };

    // Add recording and auto-select it
    scheduleOnRN(addRecordingAndSelect, newRecording);

    // Set up playback state for the new recording
    mode.set('playback');
    playbackEvents.set(
      hapticEventsToRecordingEvents(hapticEvents, hapticCurves)
    );
    playbackTotalDuration.set(duration);
    playbackTime.set(0);
    playbackStartTime.set(0);
    scrollX.set(0);

    // Reset palette indicators to center
    paletteResetTrigger.set(paletteResetTrigger.get() + 1);
  };

  const recordTransient = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get()) return;
    const timestamp = recordingTime.get();
    recordingEvents.set([
      ...recordingEvents.get(),
      { type: 'transient', timestamp, intensity, sharpness },
    ]);
  };

  const recordContinuousStart = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get()) return;
    continuousActive.set(true);
    const timestamp = recordingTime.get();
    recordingEvents.set([
      ...recordingEvents.get(),
      { type: 'continuous_start', timestamp, intensity, sharpness },
    ]);
  };

  const recordContinuousUpdate = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get()) return;

    const timestamp = recordingTime.get();
    const now = Date.now();

    // If continuous is not active, this is the first update after recording started
    // while finger was already on the palette - auto-start the continuous block
    if (!continuousActive.get()) {
      continuousActive.set(true);
      lastContinuousUpdateTime.set(now);
      recordingEvents.set([
        ...recordingEvents.get(),
        { type: 'continuous_start', timestamp, intensity, sharpness },
      ]);
      return; // The start event includes the initial values
    }

    // Throttle updates to avoid too many data points
    const timeSinceLastUpdate = now - lastContinuousUpdateTime.get();
    if (timeSinceLastUpdate < CONTINUOUS_UPDATE_THROTTLE_MS) {
      return; // Skip this update, too soon
    }

    lastContinuousUpdateTime.set(now);
    recordingEvents.set([
      ...recordingEvents.get(),
      { type: 'continuous_update', timestamp, intensity, sharpness },
    ]);
  };

  const recordContinuousEnd = () => {
    'worklet';
    if (!isRecording.get() || !continuousActive.get()) return;
    continuousActive.set(false);
    const timestamp = recordingTime.get();
    recordingEvents.set([
      ...recordingEvents.get(),
      { type: 'continuous_end', timestamp, intensity: 0, sharpness: 0 },
    ]);
  };

  // === Playback ===

  const selectRecording = (id: string | null) => {
    if (isPlaying.get()) {
      isPlaying.set(false);
      stopAllHaptics();
    }

    setSelectedRecordingId(id);

    if (id) {
      const recording = recordings.find((r) => r.id === id);
      if (recording) {
        mode.set('playback');
        playbackEvents.set(
          hapticEventsToRecordingEvents(recording.events, recording.curves)
        );
        playbackTotalDuration.set(recording.duration);
        playbackTime.set(0);
        playbackStartTime.set(0);
        scrollX.set(0);
      }
    } else {
      mode.set('idle');
      playbackEvents.set([]);
      playbackTotalDuration.set(0);
      playbackTime.set(0);
      playbackStartTime.set(0);
      scrollX.set(0);
    }
  };

  const playHapticFromTime = (seekTime: number) => {
    const recording = recordings.find((r) => r.id === selectedRecordingId);
    if (!recording) return;

    const { events, curves } = trimHapticDataFromSeekTime(
      recording.events,
      recording.curves,
      seekTime
    );

    startHaptic(events, curves);
  };

  const startPlayback = () => {
    'worklet';
    if (!selectedRecordingId) return;

    const currentTime = playbackTime.get();
    const maxTime = playbackTotalDuration.get();

    // Determine the start time
    let startFrom: number;
    if (currentTime >= maxTime) {
      // At end, restart from beginning
      startFrom = 0;
      playbackTime.set(0);
      scrollX.set(0);
    } else {
      startFrom = currentTime;
    }

    // Set playback start state
    playbackStartTime.set(startFrom);
    playbackStartTimestamp.set(Date.now());
    isPlaying.set(true);

    // Start haptics from the correct position
    scheduleOnRN(playHapticFromTime, startFrom);
  };

  const stopPlayback = () => {
    'worklet';
    isPlaying.set(false);
    scheduleOnRN(stopAllHaptics);
  };

  const seekTo = (time: number) => {
    'worklet';
    if (isPlaying.get()) {
      isPlaying.set(false);
      scheduleOnRN(stopAllHaptics);
    }

    const clampedTime = Math.max(
      0,
      Math.min(time, playbackTotalDuration.get())
    );
    playbackTime.set(clampedTime);
  };

  const onUserScrollStart = () => {
    'worklet';
    isUserScrolling.set(true);
  };

  const onUserScrollEnd = () => {
    'worklet';
    isUserScrolling.set(false);
    // Sync scrollX with playbackTime
    const time = playbackTime.get();
    scrollX.set(time * PIXELS_PER_SECOND);
  };

  const deleteRecording = (id: string) => {
    if (selectedRecordingId === id) {
      selectRecording(null);
    }
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <RecorderContext.Provider
      value={{
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
      }}
    >
      {children}
    </RecorderContext.Provider>
  );
}

export function useRecorder() {
  const context = useContext(RecorderContext);
  if (!context) {
    throw new Error('useRecorder must be used within RecorderProvider');
  }
  return context;
}

function convertToHapticData(events: RecordingEvent[]): {
  events: HapticEvent[];
  curves: HapticCurve[];
} {
  'worklet';
  const hapticEvents: HapticEvent[] = [];
  const hapticCurves: HapticCurve[] = [];
  let continuousStartIdx = -1;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;

    if (e.type === 'transient') {
      hapticEvents.push({
        type: 'transient',
        relativeTime: e.timestamp,
        parameters: [
          { type: 'intensity', value: e.intensity },
          { type: 'sharpness', value: e.sharpness },
        ],
      });
    } else if (e.type === 'continuous_start') {
      continuousStartIdx = i;
    } else if (e.type === 'continuous_end' && continuousStartIdx >= 0) {
      const startEvent = events[continuousStartIdx];
      if (!startEvent) continue;
      const duration = e.timestamp - startEvent.timestamp;

      hapticEvents.push({
        type: 'continuous',
        relativeTime: startEvent.timestamp,
        duration,
        parameters: [
          { type: 'intensity', value: startEvent.intensity },
          { type: 'sharpness', value: startEvent.sharpness },
        ],
      });

      const intensityPoints: Array<{ relativeTime: number; value: number }> =
        [];
      const sharpnessPoints: Array<{ relativeTime: number; value: number }> =
        [];

      for (let j = continuousStartIdx; j <= i; j++) {
        const evt = events[j];
        if (
          evt &&
          (evt.type === 'continuous_start' || evt.type === 'continuous_update')
        ) {
          intensityPoints.push({
            relativeTime: evt.timestamp - startEvent.timestamp,
            value: evt.intensity,
          });
          sharpnessPoints.push({
            relativeTime: evt.timestamp - startEvent.timestamp,
            value: evt.sharpness,
          });
        }
      }

      if (intensityPoints.length > 1) {
        hapticCurves.push({
          type: 'intensity',
          relativeTime: startEvent.timestamp,
          controlPoints: intensityPoints,
        });
      }
      if (sharpnessPoints.length > 1) {
        hapticCurves.push({
          type: 'sharpness',
          relativeTime: startEvent.timestamp,
          controlPoints: sharpnessPoints,
        });
      }

      continuousStartIdx = -1;
    }
  }

  return { events: hapticEvents, curves: hapticCurves };
}
