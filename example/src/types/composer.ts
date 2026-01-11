import type { HapticEvent, HapticCurve } from '@renegades/react-native-tickle';

export interface TransientComposerEvent {
  id: string;
  type: 'transient';
  startTime: number; // seconds
  intensity: number; // 0-1
  sharpness: number; // 0-1
}

export interface ContinuousComposerEvent {
  id: string;
  type: 'continuous';
  startTime: number; // seconds
  duration: number; // seconds
  intensity: number; // 0-1
  sharpness: number; // 0-1
  fadeInIntensity: number; // 0-1: starting intensity (ramps FROM this value TO 1)
  fadeInDuration: number; // seconds: time to ramp from fadeInIntensity to 1
  fadeOutIntensity: number; // 0-1: ending intensity (ramps FROM 1 TO this value)
  fadeOutDuration: number; // seconds: time to ramp from 1 to fadeOutIntensity
}

export type ComposerEvent = TransientComposerEvent | ContinuousComposerEvent;

export interface Composition {
  id: string;
  name: string;
  createdAt: number;
  events: ComposerEvent[];
}

export interface ComposerAction {
  type: 'add' | 'update' | 'delete' | 'clear';
  event?: ComposerEvent;
  previousEvents?: ComposerEvent[];
}

// Utility type guards
export function isTransientEvent(
  event: ComposerEvent
): event is TransientComposerEvent {
  return event.type === 'transient';
}

export function isContinuousEvent(
  event: ComposerEvent
): event is ContinuousComposerEvent {
  return event.type === 'continuous';
}

// Default event factories
export function createDefaultTransientEvent(
  startTime: number = 0
): TransientComposerEvent {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: 'transient',
    startTime,
    intensity: 0.5,
    sharpness: 0.5,
  };
}

export function createDefaultContinuousEvent(
  startTime: number = 0
): ContinuousComposerEvent {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: 'continuous',
    startTime,
    duration: 0.5,
    intensity: 0.5,
    sharpness: 0.5,
    fadeInIntensity: 0,
    fadeInDuration: 0,
    fadeOutIntensity: 0,
    fadeOutDuration: 0,
  };
}

// Conversion utilities
export function composerEventToHapticEvent(event: ComposerEvent): HapticEvent {
  if (event.type === 'transient') {
    return {
      type: 'transient',
      relativeTime: event.startTime * 1000, // Convert to milliseconds
      parameters: [
        { type: 'intensity', value: event.intensity },
        { type: 'sharpness', value: event.sharpness },
      ],
    };
  } else {
    return {
      type: 'continuous',
      relativeTime: event.startTime * 1000,
      duration: event.duration * 1000,
      parameters: [
        { type: 'intensity', value: event.intensity },
        { type: 'sharpness', value: event.sharpness },
      ],
    };
  }
}

export function composerEventsToCurves(events: ComposerEvent[]): HapticCurve[] {
  'worklet';
  const curves: HapticCurve[] = [];

  for (const event of events) {
    if (event.type === 'continuous') {
      const {
        startTime,
        duration,
        intensity,
        fadeInIntensity,
        fadeInDuration,
        fadeOutIntensity,
        fadeOutDuration,
      } = event;

      // Only create curves if there's a fade envelope
      const hasFadeIn = fadeInDuration > 0;
      const hasFadeOut = fadeOutDuration > 0;

      if (hasFadeIn || hasFadeOut) {
        const controlPoints: Array<{ relativeTime: number; value: number }> =
          [];

        // Fade in phase: start from fadeInIntensity, ramp up to intensity
        if (hasFadeIn) {
          // Clamp fadeInDuration to not exceed duration
          const clampedFadeInDuration = Math.min(fadeInDuration, duration);
          // Starting intensity is fadeInIntensity scaled by the target intensity
          const startIntensity = fadeInIntensity * intensity;
          controlPoints.push({ relativeTime: 0, value: startIntensity });
          controlPoints.push({
            relativeTime: clampedFadeInDuration * 1000,
            value: intensity,
          });
        } else {
          controlPoints.push({ relativeTime: 0, value: intensity });
        }

        // Calculate sustain region
        const fadeInEnd = hasFadeIn ? Math.min(fadeInDuration, duration) : 0;
        const fadeOutStart = hasFadeOut
          ? Math.max(duration - fadeOutDuration, 0)
          : duration;

        // Add sustain point if there's a gap between fade in and fade out
        if (fadeInEnd < fadeOutStart) {
          controlPoints.push({
            relativeTime: fadeOutStart * 1000,
            value: intensity,
          });
        }

        // Fade out phase: ramp down from intensity to fadeOutIntensity
        if (hasFadeOut) {
          // Ending intensity is fadeOutIntensity scaled by the target intensity
          const endIntensity = fadeOutIntensity * intensity;
          controlPoints.push({
            relativeTime: duration * 1000,
            value: endIntensity,
          });
        }

        curves.push({
          type: 'intensity',
          relativeTime: startTime * 1000,
          controlPoints,
        });
      }
    }
  }

  return curves;
}

export function getCompositionDuration(events: ComposerEvent[]): number {
  if (events.length === 0) return 0;

  // Add a small buffer (0.1s) after transient events for playback purposes
  const TRANSIENT_BUFFER = 0.1;

  return events.reduce((maxTime, event) => {
    const eventEnd =
      event.type === 'continuous'
        ? event.startTime + event.duration
        : event.startTime + TRANSIENT_BUFFER; // Transient events need buffer for playback
    return Math.max(maxTime, eventEnd);
  }, 0);
}
