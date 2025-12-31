import type { HapticEvent, HapticCurve } from 'react-native-ahap';

export interface RecordedHaptic {
  id: string;
  name: string;
  createdAt: number;
  duration: number; // in seconds
  events: HapticEvent[];
  curves: HapticCurve[];
}

export interface RecordingEvent {
  type: 'transient' | 'continuous_start' | 'continuous_update' | 'continuous_end';
  timestamp: number; // relative to recording start in seconds
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
