import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type {
  Tickle,
  HapticCurve,
  HapticEventParameter,
  HapticParameterType,
  HapticImpactStyle,
  HapticNotificationType,
} from './Tickle.nitro';

export type TransientHapticEvent = {
  type: 'transient';
  parameters: HapticEventParameter[];
  relativeTime: number;
};

export type ContinuousHapticEvent = {
  type: 'continuous';
  parameters: HapticEventParameter[];
  relativeTime: number;
  duration: number;
};

export type HapticEvent = TransientHapticEvent | ContinuousHapticEvent;

const TickleHybridObject = NitroModules.createHybridObject<Tickle>('Tickle');

const boxedTickle = NitroModules.box(TickleHybridObject);

export function startHaptic(
  events: HapticEvent[],
  curves: HapticCurve[]
): void {
  'worklet';

  return boxedTickle.unbox().startHaptic(events, curves);
}

export function stopAllHaptics(): void {
  'worklet';

  return boxedTickle.unbox().stopAllHaptics();
}

export function initializeEngine(): void {
  'worklet';

  return boxedTickle.unbox().initializeEngine();
}

export function destroyEngine(): void {
  'worklet';

  return boxedTickle.unbox().destroyEngine();
}

export function createContinuousPlayer(
  playerId: string,
  initialIntensity: number,
  initialSharpness: number
): void {
  'worklet';

  return boxedTickle
    .unbox()
    .createContinuousPlayer(playerId, initialIntensity, initialSharpness);
}

export function startContinuousPlayer(playerId: string): void {
  'worklet';

  return boxedTickle.unbox().startContinuousPlayer(playerId);
}

export function updateContinuousPlayer(
  playerId: string,
  intensityControl: number,
  sharpnessControl: number
): void {
  'worklet';

  return boxedTickle
    .unbox()
    .updateContinuousPlayer(playerId, intensityControl, sharpnessControl);
}

export function stopContinuousPlayer(playerId: string): void {
  'worklet';
  return boxedTickle.unbox().stopContinuousPlayer(playerId);
}

export function destroyContinuousPlayer(playerId: string): void {
  'worklet';
  return boxedTickle.unbox().destroyContinuousPlayer(playerId);
}

// MARK: - System Haptics (Predefined OS-level feedback)

/**
 * Triggers an impact haptic with the specified style.
 * Simulates a physical collision feedback.
 *
 * @param style - The intensity style of the impact ('rigid' | 'heavy' | 'medium' | 'light' | 'soft')
 *
 * @example
 * ```ts
 * // Light tap for subtle UI feedback
 * triggerImpact('light');
 *
 * // Heavy impact for significant actions
 * triggerImpact('heavy');
 * ```
 */
export function triggerImpact(style: HapticImpactStyle): void {
  'worklet';
  return boxedTickle.unbox().triggerImpact(style);
}

/**
 * Triggers a notification-style haptic for alerts and status updates.
 * Use this for communicating outcomes of actions to the user.
 *
 * @param type - The notification type ('error' | 'success' | 'warning')
 *
 * @example
 * ```ts
 * // Success feedback after completing an action
 * triggerNotification('success');
 *
 * // Error feedback when something goes wrong
 * triggerNotification('error');
 * ```
 */
export function triggerNotification(type: HapticNotificationType): void {
  'worklet';
  return boxedTickle.unbox().triggerNotification(type);
}

/**
 * Triggers a selection change haptic.
 * Best used for picker wheels, toggles, and selection changes.
 *
 * @example
 * ```ts
 * // When user scrolls through picker options
 * triggerSelection();
 * ```
 */
export function triggerSelection(): void {
  'worklet';
  return boxedTickle.unbox().triggerSelection();
}

// MARK: - Global Haptics Enable/Disable

/**
 * Enable or disable haptics globally. This setting is persisted across app restarts.
 * When disabled, all haptic functions become no-ops (no haptics will play).
 * This does not affect engine initialization/destruction.
 *
 * @param enabled - Whether haptics should be enabled
 */
export function setHapticsEnabled(enabled: boolean): void {
  'worklet';
  return boxedTickle.unbox().setHapticsEnabled(enabled);
}

/**
 * Get the current global haptics enabled state.
 * Defaults to true if not previously set.
 *
 * @returns Whether haptics are currently enabled
 */
export function getHapticsEnabled(): boolean {
  'worklet';
  return boxedTickle.unbox().getHapticsEnabled();
}

/**
 * Hook to manage the global haptics enabled state.
 * Provides reactive state and a setter function.
 *
 * @returns [isEnabled, setEnabled] - Current state and setter function
 *
 * @example
 * ```tsx
 * function SettingsScreen() {
 *   const [hapticsEnabled, setHapticsEnabled] = useHapticsEnabled();
 *
 *   return (
 *     <Switch
 *       value={hapticsEnabled}
 *       onValueChange={setHapticsEnabled}
 *     />
 *   );
 * }
 * ```
 */
export function useHapticsEnabled(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(() => getHapticsEnabled());

  const setHapticsEnabledState = useCallback((value: boolean) => {
    setHapticsEnabled(value);
    setEnabled(value);
  }, []);

  return [enabled, setHapticsEnabledState] as const;
}

/**
 * Hook to manage a continuous haptic player lifecycle.
 *
 * @param playerId - A unique string key to identify this player (e.g., 'my-palette')
 * @param initialIntensity - Initial intensity value (0.0 to 1.0)
 * @param initialSharpness - Initial sharpness value (0.0 to 1.0)
 *
 * @returns Object with JS-bound methods for convenience:
 * - `start()` - Start the continuous haptic
 * - `stop()` - Stop the continuous haptic
 * - `update(intensity, sharpness)` - Update haptic parameters
 * - `playerId` - The player key (for use in worklets)
 *
 * @example
 * ```tsx
 * const PLAYER_KEY = 'my-palette';
 *
 * function MyComponent() {
 *   const { start, stop, update } = useContinuousPlayer(PLAYER_KEY, 1.0, 0.5);
 *
 *   const gesture = Gesture.Pan()
 *     .onBegin(() => {
 *       start();
 *     })
 *     .onUpdate(() => {
 *       update(0.5, 0.5);
 *     })
 *     .onEnd(() => {
 *       stop();
 *     });
 * }
 * ```
 */
export function useContinuousPlayer(
  playerId: string,
  initialIntensity: number = 1.0,
  initialSharpness: number = 0.5
) {
  useEffect(() => {
    createContinuousPlayer(playerId, initialIntensity, initialSharpness);

    return () => {
      destroyContinuousPlayer(playerId);
    };
  }, [playerId, initialIntensity, initialSharpness]);

  return {
    start: () => {
      'worklet';
      startContinuousPlayer(playerId);
    },
    stop: () => {
      'worklet';
      stopContinuousPlayer(playerId);
    },
    update: (intensity: number, sharpness: number) => {
      'worklet';
      return updateContinuousPlayer(playerId, intensity, sharpness);
    },
    playerId,
  };
}

export function useHapticEngine() {
  useEffect(() => {
    initializeEngine();

    const off = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        initializeEngine();
      } else if (state === 'background') {
        destroyEngine();
      }
    });

    return () => {
      off.remove();
    };
  }, []);
}

export function HapticProvider({ children }: { children: React.ReactNode }) {
  useHapticEngine();

  return <>{children}</>;
}

export { TickleHybridObject };
export type {
  HapticCurve,
  HapticEventParameter,
  HapticParameterType,
  HapticImpactStyle,
  HapticNotificationType,
};
