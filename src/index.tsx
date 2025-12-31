import { useEffect } from 'react';
import { AppState } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { Ahap, HapticCurve, HapticEvent } from './Ahap.nitro';

const AhapHybridObject = NitroModules.createHybridObject<Ahap>('Ahap');

export function startHaptic(
  events: HapticEvent[],
  curves: HapticCurve[]
): void {
  return AhapHybridObject.startHaptic(events, curves);
}

export function stopAllHaptics(): void {
  return AhapHybridObject.stopAllHaptics();
}

export function initializeEngine(): void {
  return AhapHybridObject.initializeEngine();
}

export function destroyEngine(): void {
  return AhapHybridObject.destroyEngine();
}

// Continuous player methods for smooth haptic feedback
export function createContinuousPlayer(
  initialIntensity: number,
  initialSharpness: number
): void {
  'worklet';
  return AhapHybridObject.createContinuousPlayer(
    initialIntensity,
    initialSharpness
  );
}

export function startContinuousPlayer(): void {
  'worklet';
  return AhapHybridObject.startContinuousPlayer();
}

export function updateContinuousPlayer(
  intensityControl: number,
  sharpnessControl: number
): void {
  'worklet';
  return AhapHybridObject.updateContinuousPlayer(
    intensityControl,
    sharpnessControl
  );
}

export function stopContinuousPlayer(): void {
  'worklet';
  return AhapHybridObject.stopContinuousPlayer();
}

export function useHapticEngine(options?: {
  initialIntensity?: number;
  initialSharpness?: number;
}) {
  const { initialIntensity = 1.0, initialSharpness = 0.5 } = options ?? {};

  useEffect(() => {
    // Initialize engine for both iOS and Android
    initializeEngine();
    // Create the continuous player with initial parameters
    createContinuousPlayer(initialIntensity, initialSharpness);

    const off = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        initializeEngine();
        createContinuousPlayer(initialIntensity, initialSharpness);
      } else if (state === 'background') {
        destroyEngine();
      }
    });

    return () => {
      off.remove();
    };
  }, [initialIntensity, initialSharpness]);
}

export { AhapHybridObject };
export type { HapticCurve, HapticEvent };
