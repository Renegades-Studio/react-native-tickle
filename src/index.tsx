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

export function useHapticEngine() {
  useEffect(() => {
    // Initialize engine for both iOS and Android
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

export { AhapHybridObject };
export type { HapticCurve, HapticEvent };
