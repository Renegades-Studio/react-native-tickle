import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  useSharedValue,
  useFrameCallback,
  type SharedValue,
  type FrameCallback,
} from 'react-native-reanimated';
import type { RecordedHaptic, RecordingEvent } from '../types/recording';
import type { HapticEvent, HapticCurve } from '@renegades/react-native-tickle';
import { startHaptic, stopAllHaptics } from '@renegades/react-native-tickle';
import { trimHapticDataFromSeekTime } from '../utils/hapticPlayback';
import { PIXELS_PER_MILLISECOND } from '../components/RecordingTimeline';
import { scheduleOnRN } from 'react-native-worklets';
import { storage, STORAGE_KEYS } from '../utils/storage';

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
  importRecording: (recording: RecordedHaptic) => void;
  importAndSelectRecording: (recording: RecordedHaptic) => void;
  renameRecording: (id: string, name: string) => void;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function RecorderProvider({ children }: { children: ReactNode }) {
  const [recordings, _setRecordings] = useState<RecordedHaptic[]>(() => {
    try {
      const stored = storage.getString(STORAGE_KEYS.RECORDINGS);
      if (stored) {
        return JSON.parse(stored) as RecordedHaptic[];
      }
    } catch (error) {
      console.error('Failed to load recordings from storage:', error);
    }
    return [];
  });
  const setRecordings = (recordings: RecordedHaptic[]) => {
    storage.set(STORAGE_KEYS.RECORDINGS, JSON.stringify(recordings));
    _setRecordings(recordings);
  };
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
    null
  );

  const mode = useSharedValue<TimelineMode>('idle');

  const isRecording = useSharedValue(false);
  const recordingStartTimestamp = useSharedValue(0);
  const recordingTime = useSharedValue(0);
  const recordingEvents = useSharedValue<RecordingEvent[]>([]);
  const continuousActive = useSharedValue(false);
  const lastContinuousUpdateTime = useSharedValue(0);

  const CONTINUOUS_UPDATE_THROTTLE_MS = 16;

  const isPlaying = useSharedValue(false);
  const playbackStartTimestamp = useSharedValue(0);
  const playbackStartTime = useSharedValue(0);
  const playbackTime = useSharedValue(0);
  const playbackEvents = useSharedValue<RecordingEvent[]>([]);
  const playbackTotalDuration = useSharedValue(0);

  const scrollX = useSharedValue(0);
  const isUserScrolling = useSharedValue(false);

  const paletteResetTrigger = useSharedValue(0);

  const continuousGestureActive = useSharedValue(false);
  const continuousGestureIntensity = useSharedValue(0.5);
  const continuousGestureSharpness = useSharedValue(0.5);

  const frameCallback = useFrameCallback(() => {
    const now = Date.now();

    if (mode.get() === 'recording' && isRecording.get()) {
      const elapsed = now - recordingStartTimestamp.get();
      recordingTime.set(elapsed);
      scrollX.set(elapsed * PIXELS_PER_MILLISECOND);
    } else if (mode.get() === 'playback' && isPlaying.get()) {
      const elapsed = now - playbackStartTimestamp.get();
      const newTime = playbackStartTime.get() + elapsed;
      const maxTime = playbackTotalDuration.get();

      if (newTime >= maxTime) {
        playbackTime.set(maxTime);
        isPlaying.set(false);
        scrollX.set(maxTime * PIXELS_PER_MILLISECOND);
      } else {
        playbackTime.set(newTime);
        scrollX.set(newTime * PIXELS_PER_MILLISECOND);
      }
    }
  }, false);

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

    if (!continuousGestureActive.get()) {
      paletteResetTrigger.set(paletteResetTrigger.get() + 1);
    }
  };

  const addRecordingAndSelect = (recording: RecordedHaptic) => {
    setRecordings([...recordings, recording]);
    setSelectedRecordingId(recording.id);
  };

  const stopRecording = () => {
    'worklet';
    const timestamp = recordingTime.get();
    const wasContinuousActive = continuousActive.get();

    isRecording.set(false);

    let events = recordingEvents.get();

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
      recordingEvents: events,
    };

    scheduleOnRN(addRecordingAndSelect, newRecording);

    mode.set('playback');
    playbackEvents.set(events);
    playbackTotalDuration.set(duration);
    playbackTime.set(0);
    playbackStartTime.set(0);
    scrollX.set(0);

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

    if (!continuousActive.get()) {
      continuousActive.set(true);
      lastContinuousUpdateTime.set(now);
      recordingEvents.set([
        ...recordingEvents.get(),
        { type: 'continuous_start', timestamp, intensity, sharpness },
      ]);
      return;
    }

    const timeSinceLastUpdate = now - lastContinuousUpdateTime.get();
    if (timeSinceLastUpdate < CONTINUOUS_UPDATE_THROTTLE_MS) {
      return;
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
        playbackEvents.set(recording.recordingEvents);
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
    'worklet';
    const recording = recordings.find((r) => r.id === selectedRecordingId);
    if (!recording) return;

    const { events, curves } = trimHapticDataFromSeekTime(
      recording.events,
      recording.curves,
      seekTime
    );

    // Split events into continuous and transient to play them in separate patterns.
    // This prevents CHHapticParameterCurves (which are pattern-level multipliers)
    // from affecting transient events - they should play at their recorded intensity.
    const continuousEvents = events.filter((e) => e.type === 'continuous');
    const transientEvents = events.filter((e) => e.type === 'transient');

    // Play continuous events with their associated parameter curves
    if (continuousEvents.length > 0) {
      startHaptic(continuousEvents, curves);
    }

    // Play transient events in a separate pattern with NO curves
    // so they're not affected by continuous intensity/sharpness modulation
    if (transientEvents.length > 0) {
      startHaptic(transientEvents, []);
    }
  };

  const startPlayback = () => {
    'worklet';
    if (!selectedRecordingId) return;

    const currentTime = playbackTime.get();
    const maxTime = playbackTotalDuration.get();

    let startFrom: number;
    if (currentTime >= maxTime) {
      startFrom = 0;
      playbackTime.set(0);
      scrollX.set(0);
    } else {
      startFrom = currentTime;
    }

    playbackStartTime.set(startFrom);
    playbackStartTimestamp.set(Date.now());
    isPlaying.set(true);

    playHapticFromTime(startFrom);
  };

  const stopPlayback = () => {
    'worklet';
    isPlaying.set(false);
    stopAllHaptics();
  };

  const seekTo = (time: number) => {
    'worklet';
    if (isPlaying.get()) {
      isPlaying.set(false);
      stopAllHaptics();
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
    const time = playbackTime.get();
    scrollX.set(time * PIXELS_PER_MILLISECOND);
  };

  const deleteRecording = (id: string) => {
    if (selectedRecordingId === id) {
      selectRecording(null);
    }
    setRecordings(recordings.filter((r) => r.id !== id));
  };

  const importRecording = (recording: RecordedHaptic) => {
    setRecordings([...recordings, recording]);
  };

  const importAndSelectRecording = (recording: RecordedHaptic) => {
    // Stop any current playback
    if (isPlaying.get()) {
      isPlaying.set(false);
      stopAllHaptics();
    }

    // Add to recordings list
    setRecordings([...recordings, recording]);

    // Directly set playback state (don't look up from recordings array)
    setSelectedRecordingId(recording.id);
    mode.set('playback');
    playbackEvents.set(recording.recordingEvents);
    playbackTotalDuration.set(recording.duration);
    playbackTime.set(0);
    playbackStartTime.set(0);
    scrollX.set(0);
  };

  const renameRecording = (id: string, name: string) => {
    setRecordings(recordings.map((r) => (r.id === id ? { ...r, name } : r)));
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
        importRecording,
        importAndSelectRecording,
        renameRecording,
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
