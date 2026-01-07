import type { HybridObject } from 'react-native-nitro-modules';

export type HapticEventType = 'transient' | 'continuous';
export type HapticParameterType = 'intensity' | 'sharpness';

// MARK: - System Haptic Types

/**
 * Feedback intensity styles for impact haptics.
 * Maps to UIImpactFeedbackGenerator.FeedbackStyle on iOS.
 */
export type HapticImpactStyle = 'rigid' | 'heavy' | 'medium' | 'light' | 'soft';

/**
 * Notification feedback categories for alert-style haptics.
 * Maps to UINotificationFeedbackGenerator.FeedbackType on iOS.
 */
export type HapticNotificationType = 'error' | 'success' | 'warning';

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

  // MARK: - System Haptics (Predefined OS-level feedback)

  /**
   * Triggers an impact haptic with the specified style.
   * Simulates a physical collision feedback.
   */
  triggerImpact(style: HapticImpactStyle): void;

  /**
   * Triggers a notification-style haptic for alerts and status updates.
   */
  triggerNotification(type: HapticNotificationType): void;

  /**
   * Triggers a selection change haptic.
   * Best used for picker wheels, toggles, and selection changes.
   */
  triggerSelection(): void;
}
