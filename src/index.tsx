import { NitroModules } from 'react-native-nitro-modules';
import type { Ahap } from './Ahap.nitro';

const AhapHybridObject =
  NitroModules.createHybridObject<Ahap>('Ahap');

export function multiply(a: number, b: number): number {
  return AhapHybridObject.multiply(a, b);
}
