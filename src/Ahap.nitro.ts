import type { HybridObject } from 'react-native-nitro-modules';

export type HapticEventType = 'transient' | 'continuous';
export type HapticParameterType = 'intensity' | 'sharpness';

export type HapticEventParameter = {
  type: HapticParameterType;
  value: number;
};
export type HapticCurveControlPoint = {
  relativeTime: number;
  value: number;
};

export type HapticEvent = {
  type: HapticEventType;
  parameters: HapticEventParameter[];
  relativeTime: number;
  duration?: number; // Optional for transient events
};

export type HapticCurve = {
  type: HapticParameterType;
  controlPoints: HapticCurveControlPoint[];
  relativeTime: number;
};

export interface Ahap
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  startHaptic(events: HapticEvent[], curves: HapticCurve[]): void;
  stopAllHaptics(): void;
  initializeEngine(): void;
  destroyEngine(): void;

  createContinuousPlayer(
    playerId: string,
    initialIntensity: number,
    initialSharpness: number
  ): void;
  startContinuousPlayer(playerId: string): void;
  updateContinuousPlayer(
    playerId: string,
    intensityControl: number,
    sharpnessControl: number
  ): void;
  stopContinuousPlayer(playerId: string): void;
  destroyContinuousPlayer(playerId: string): void;

  setHapticsEnabled(enabled: boolean): void;
  getHapticsEnabled(): boolean;
}
