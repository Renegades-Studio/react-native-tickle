import type { HybridObject } from 'react-native-nitro-modules';

export type HapticEventType = 'transient' | 'continuous';
export type HapticParameterType = 'intensity' | 'sharpness';
export type HapticCurveType = 'intensity' | 'sharpness';
export type HapticEventParameter = {
  type: HapticParameterType;
  value: number;
};
export type HapticCurveControlPoint = {
  relativeTime: number;
  value: number;
};

export type HapticEvent =
  | {
      type: 'transient';
      parameters: HapticEventParameter[];
      relativeTime: number;
    }
  | {
      type: 'continuous';
      parameters: HapticEventParameter[];
      relativeTime: number;
      duration: number;
    };

export type HapticCurve = {
  type: HapticCurveType;
  controlPoints: HapticCurveControlPoint[];
  relativeTime: number;
};

export interface Ahap
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  startHaptic(events: HapticEvent[], curves: HapticCurve[]): void;
  stopAllHaptics(): void;
  initializeEngine(): void;
  destroyEngine(): void;

  // Continuous player methods for smooth haptic feedback
  createContinuousPlayer(
    initialIntensity: number,
    initialSharpness: number
  ): void;
  startContinuousPlayer(): void;
  updateContinuousPlayer(
    intensityControl: number,
    sharpnessControl: number
  ): void;
  stopContinuousPlayer(): void;
}
