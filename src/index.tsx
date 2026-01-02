import { useEffect } from 'react';
import { AppState } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { Ahap, HapticCurve, HapticEvent } from './Ahap.nitro';

const AhapHybridObject = NitroModules.createHybridObject<Ahap>('Ahap');

const boxedAhap = NitroModules.box(AhapHybridObject);

export function startHaptic(
  events: HapticEvent[],
  curves: HapticCurve[]
): void {
  'worklet';

  return boxedAhap.unbox().startHaptic(events, curves);
}

export function stopAllHaptics(): void {
  'worklet';

  return boxedAhap.unbox().stopAllHaptics();
}

export function initializeEngine(): void {
  'worklet';

  return boxedAhap.unbox().initializeEngine();
}

export function destroyEngine(): void {
  'worklet';

  return boxedAhap.unbox().destroyEngine();
}

// Continuous player methods for smooth haptic feedback
export function createContinuousPlayer(
  initialIntensity: number,
  initialSharpness: number
): void {
  'worklet';

  return boxedAhap
    .unbox()
    .createContinuousPlayer(initialIntensity, initialSharpness);
}

export function startContinuousPlayer(): void {
  'worklet';

  return boxedAhap.unbox().startContinuousPlayer();
}

export function updateContinuousPlayer(
  intensityControl: number,
  sharpnessControl: number
): void {
  'worklet';

  return boxedAhap
    .unbox()
    .updateContinuousPlayer(intensityControl, sharpnessControl);
}

export function stopContinuousPlayer(): void {
  'worklet';
  return boxedAhap.unbox().stopContinuousPlayer();
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

export { AhapHybridObject };
export type { HapticCurve, HapticEvent };
