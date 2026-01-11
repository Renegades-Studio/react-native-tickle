import type { HapticCurve, HapticEvent } from '@renegades/react-native-tickle';

export interface RecordedHaptic {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  events: HapticEvent[];
  curves: HapticCurve[];
  recordingEvents: RecordingEvent[];
}

export interface RecordingEvent {
  type:
    | 'transient'
    | 'continuous_start'
    | 'continuous_update'
    | 'continuous_end';
  timestamp: number;
  intensity: number;
  sharpness: number;
}

export interface ContinuousSession {
  startTime: number;
  updates: Array<{
    timestamp: number;
    intensity: number;
    sharpness: number;
  }>;
}
