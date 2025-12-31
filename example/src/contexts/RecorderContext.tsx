import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  useSharedValue,
  runOnJS,
  useFrameCallback,
  type SharedValue,
  type FrameCallback,
} from 'react-native-reanimated';
import type { RecordedHaptic, RecordingEvent } from '../types/recording';
import type { HapticEvent, HapticCurve } from 'react-native-ahap';
import { startHaptic } from 'react-native-ahap';
import {
  TIMELINE_WIDTH,
  PIXELS_PER_SECOND,
} from '../components/RecordingTimeline';

interface RecorderContextValue {
  // Shared values for UI thread
  isRecording: SharedValue<boolean>;
  recordingDuration: SharedValue<number>;
  recordedEvents: SharedValue<RecordingEvent[]>;
  scrollPosition: SharedValue<number>;

  // React state for recordings list
  recordings: RecordedHaptic[];

  // Frame callback control
  frameCallback: FrameCallback;

  // Actions (worklets)
  startRecording: () => void;
  stopRecording: () => void;
  recordTransient: (intensity: number, sharpness: number) => void;
  recordContinuousStart: (intensity: number, sharpness: number) => void;
  recordContinuousUpdate: (intensity: number, sharpness: number) => void;
  recordContinuousEnd: () => void;

  // JS thread actions
  playRecording: (id: string) => void;
  deleteRecording: (id: string) => void;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function RecorderProvider({ children }: { children: ReactNode }) {
  // React state for recordings list
  const [recordings, setRecordings] = useState<RecordedHaptic[]>([]);

  // Shared values for UI thread access
  const isRecording = useSharedValue(false);
  const recordingStartTime = useSharedValue(0);
  const recordingDuration = useSharedValue(0);
  const recordedEvents = useSharedValue<RecordingEvent[]>([]);
  const continuousActive = useSharedValue(false);
  const scrollPosition = useSharedValue(0);

  // Single frame callback for all real-time updates
  // Uses isRecording to check if it should update (always running when recording)
  const frameCallback = useFrameCallback((frameInfo) => {
    if (!isRecording.get()) return;

    // Update duration
    const duration = frameInfo.timeSinceFirstFrame / 1000;
    recordingDuration.set(duration);

    // Update scroll position
    const playheadPosition = duration * PIXELS_PER_SECOND;
    const newScrollPosition =
      playheadPosition > TIMELINE_WIDTH / 2
        ? playheadPosition - TIMELINE_WIDTH / 2
        : 0;

    scrollPosition.set(newScrollPosition);
  }, false); // Don't autostart

  const addRecording = (recording: RecordedHaptic) => {
    setRecordings((prev) => [...prev, recording]);
  };

  const startRecording = () => {
    'worklet';
    recordingStartTime.set(Date.now());
    recordedEvents.set([]);
    continuousActive.set(false);
    isRecording.set(true);
    recordingDuration.set(0);
    scrollPosition.set(0);
  };

  const finalizeRecording = (events: RecordingEvent[], duration: number) => {
    'worklet';
    const { events: hapticEvents, curves: hapticCurves } =
      convertEventsToHapticData(events);

    const recordingCount = recordings.length + 1;

    const newRecording: RecordedHaptic = {
      id: Date.now().toString(),
      name: `Recording ${recordingCount}`,
      createdAt: Date.now(),
      duration,
      events: hapticEvents,
      curves: hapticCurves,
    };

    runOnJS(addRecording)(newRecording);
  };

  const stopRecording = () => {
    'worklet';
    isRecording.set(false);

    // Close any open continuous session
    if (continuousActive.get()) {
      const endTime = (Date.now() - recordingStartTime.get()) / 1000;
      recordedEvents.set([
        ...recordedEvents.get(),
        {
          type: 'continuous_end' as const,
          timestamp: endTime,
          intensity: 0,
          sharpness: 0,
        },
      ]);
      continuousActive.set(false);
    }

    const duration = (Date.now() - recordingStartTime.get()) / 1000;
    const events = [...recordedEvents.get()];

    finalizeRecording(events, duration);

    recordingDuration.set(0);
    scrollPosition.set(0);
  };

  const recordTransient = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get()) return;

    const timestamp = (Date.now() - recordingStartTime.get()) / 1000;
    recordedEvents.set([
      ...recordedEvents.get(),
      {
        type: 'transient' as const,
        timestamp,
        intensity,
        sharpness,
      },
    ]);
  };

  const recordContinuousStart = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get()) return;

    const timestamp = (Date.now() - recordingStartTime.get()) / 1000;
    continuousActive.set(true);

    recordedEvents.set([
      ...recordedEvents.get(),
      {
        type: 'continuous_start' as const,
        timestamp,
        intensity,
        sharpness,
      },
    ]);
  };

  const recordContinuousUpdate = (intensity: number, sharpness: number) => {
    'worklet';
    if (!isRecording.get() || !continuousActive.get()) return;

    const timestamp = (Date.now() - recordingStartTime.get()) / 1000;

    recordedEvents.set([
      ...recordedEvents.get(),
      {
        type: 'continuous_update' as const,
        timestamp,
        intensity,
        sharpness,
      },
    ]);
  };

  const recordContinuousEnd = () => {
    'worklet';
    if (!isRecording.get() || !continuousActive.get()) return;

    const timestamp = (Date.now() - recordingStartTime.get()) / 1000;

    recordedEvents.set([
      ...recordedEvents.get(),
      {
        type: 'continuous_end' as const,
        timestamp,
        intensity: 0,
        sharpness: 0,
      },
    ]);
    continuousActive.set(false);
  };

  const playRecording = (id: string) => {
    const recording = recordings.find((r) => r.id === id);
    if (!recording) return;

    startHaptic(recording.events, recording.curves);
  };

  const deleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <RecorderContext.Provider
      value={{
        isRecording,
        recordingDuration,
        recordedEvents,
        scrollPosition,
        recordings,
        frameCallback,
        startRecording,
        stopRecording,
        recordTransient,
        recordContinuousStart,
        recordContinuousUpdate,
        recordContinuousEnd,
        playRecording,
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
    throw new Error('useRecorder must be used within a RecorderProvider');
  }
  return context;
}

function convertEventsToHapticData(events: RecordingEvent[]): {
  events: HapticEvent[];
  curves: HapticCurve[];
} {
  'worklet';
  const hapticEvents: HapticEvent[] = [];
  const hapticCurves: HapticCurve[] = [];

  let continuousStartIndex = -1;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'transient') {
      hapticEvents.push({
        type: 'transient',
        relativeTime: event.timestamp,
        parameters: [
          { type: 'intensity', value: event.intensity },
          { type: 'sharpness', value: event.sharpness },
        ],
      });
    } else if (event.type === 'continuous_start') {
      continuousStartIndex = i;
    } else if (event.type === 'continuous_end' && continuousStartIndex >= 0) {
      const startEvent = events[continuousStartIndex];
      const duration = event.timestamp - startEvent.timestamp;

      hapticEvents.push({
        type: 'continuous',
        relativeTime: startEvent.timestamp,
        duration,
        parameters: [
          { type: 'intensity', value: startEvent.intensity },
          { type: 'sharpness', value: startEvent.sharpness },
        ],
      });

      const intensityControlPoints: Array<{
        relativeTime: number;
        value: number;
      }> = [];
      const sharpnessControlPoints: Array<{
        relativeTime: number;
        value: number;
      }> = [];

      for (let j = continuousStartIndex; j <= i; j++) {
        const e = events[j];
        if (e.type === 'continuous_start' || e.type === 'continuous_update') {
          const relativeTime = e.timestamp - startEvent.timestamp;
          intensityControlPoints.push({
            relativeTime,
            value: e.intensity,
          });
          sharpnessControlPoints.push({
            relativeTime,
            value: e.sharpness,
          });
        }
      }

      if (intensityControlPoints.length > 1) {
        hapticCurves.push({
          type: 'intensity',
          relativeTime: startEvent.timestamp,
          controlPoints: intensityControlPoints,
        });
      }

      if (sharpnessControlPoints.length > 1) {
        hapticCurves.push({
          type: 'sharpness',
          relativeTime: startEvent.timestamp,
          controlPoints: sharpnessControlPoints,
        });
      }

      continuousStartIndex = -1;
    }
  }

  return { events: hapticEvents, curves: hapticCurves };
}

