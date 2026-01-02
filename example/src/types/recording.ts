import type { HapticCurve, HapticEvent } from 'react-native-ahaps';

export interface RecordedHaptic {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  events: HapticEvent[];
  curves: HapticCurve[];
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
