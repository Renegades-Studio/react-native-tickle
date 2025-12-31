import type { HapticEvent, HapticCurve } from 'react-native-ahap';

function getCurveEndTime(curve: HapticCurve): number {
  'worklet';
  if (curve.controlPoints.length === 0) {
    return curve.relativeTime;
  }
  const lastPoint = curve.controlPoints[curve.controlPoints.length - 1];
  if (!lastPoint) {
    return curve.relativeTime;
  }
  return curve.relativeTime + lastPoint.relativeTime;
}

function interpolateValue(
  p1: { relativeTime: number; value: number },
  p2: { relativeTime: number; value: number },
  targetTime: number
): number {
  'worklet';
  const t =
    (targetTime - p1.relativeTime) / (p2.relativeTime - p1.relativeTime);
  return p1.value + t * (p2.value - p1.value);
}

/**
 * Converts HapticEvent array to RecordingEvent array for timeline display
 */
export function hapticEventsToRecordingEvents(events: HapticEvent[]): Array<{
  type: 'transient' | 'continuous_start' | 'continuous_end';
  timestamp: number;
  intensity: number;
  sharpness: number;
}> {
  'worklet';

  const result: Array<{
    type: 'transient' | 'continuous_start' | 'continuous_end';
    timestamp: number;
    intensity: number;
    sharpness: number;
  }> = [];

  for (const event of events) {
    const intensity =
      event.parameters?.find((p) => p.type === 'intensity')?.value ?? 1;
    const sharpness =
      event.parameters?.find((p) => p.type === 'sharpness')?.value ?? 0.5;

    if (event.type === 'transient') {
      result.push({
        type: 'transient',
        timestamp: event.relativeTime,
        intensity,
        sharpness,
      });
    } else if (event.type === 'continuous') {
      result.push({
        type: 'continuous_start',
        timestamp: event.relativeTime,
        intensity,
        sharpness,
      });
      result.push({
        type: 'continuous_end',
        timestamp: event.relativeTime + (event.duration ?? 0),
        intensity: 0,
        sharpness: 0,
      });
    }
  }

  return result;
}

function trimEvent(event: HapticEvent, seekTime: number): HapticEvent | null {
  'worklet';

  if (event.type === 'transient') {
    // Transient events: skip if before seekTime, otherwise adjust time
    if (event.relativeTime < seekTime) {
      return null;
    }
    return {
      ...event,
      relativeTime: event.relativeTime - seekTime,
    };
  }

  if (event.type === 'continuous') {
    const eventEnd = event.relativeTime + (event.duration ?? 0);

    // Event ends before seekTime - skip it
    if (eventEnd <= seekTime) {
      return null;
    }

    // Event starts after seekTime - just adjust the time
    if (event.relativeTime >= seekTime) {
      return {
        ...event,
        relativeTime: event.relativeTime - seekTime,
      };
    }

    // Event spans the seekTime - trim the beginning
    const newDuration = eventEnd - seekTime;
    return {
      ...event,
      relativeTime: 0,
      duration: newDuration,
    };
  }

  return event;
}

function trimCurve(curve: HapticCurve, seekTime: number): HapticCurve | null {
  'worklet';

  const curveEnd = getCurveEndTime(curve);

  // Curve ends before seekTime - skip it
  if (curveEnd <= seekTime) {
    return null;
  }

  // Curve starts after seekTime - just adjust the time
  if (curve.relativeTime >= seekTime) {
    return {
      ...curve,
      relativeTime: curve.relativeTime - seekTime,
    };
  }

  // Curve spans the seekTime - trim and interpolate control points
  const trimmedControlPoints: Array<{ relativeTime: number; value: number }> =
    [];

  // Calculate the offset within the curve
  const seekOffset = seekTime - curve.relativeTime;

  // Find control points after seek offset and interpolate starting value
  let prevPoint: { relativeTime: number; value: number } | null = null;

  for (const point of curve.controlPoints) {
    if (point.relativeTime >= seekOffset) {
      // If this is the first point after seek, add an interpolated start point
      if (trimmedControlPoints.length === 0 && prevPoint) {
        const interpolatedValue = interpolateValue(
          prevPoint,
          point,
          seekOffset
        );
        trimmedControlPoints.push({
          relativeTime: 0,
          value: interpolatedValue,
        });
      }
      trimmedControlPoints.push({
        relativeTime: point.relativeTime - seekOffset,
        value: point.value,
      });
    }
    prevPoint = point;
  }

  // If no control points remain, skip the curve
  if (trimmedControlPoints.length === 0) {
    return null;
  }

  // Ensure we have a start point at 0
  const firstPoint = trimmedControlPoints[0];
  if (firstPoint && firstPoint.relativeTime > 0 && prevPoint) {
    const interpolatedValue = interpolateValue(
      prevPoint,
      firstPoint,
      seekOffset
    );
    trimmedControlPoints.unshift({
      relativeTime: 0,
      value: interpolatedValue,
    });
  }

  return {
    ...curve,
    relativeTime: 0,
    controlPoints: trimmedControlPoints,
  };
}

/**
 * Trims haptic events and curves to start from a given seek time.
 * - Removes events that end before seekTime
 * - Adjusts events that span the seekTime
 * - Shifts all remaining event times relative to seekTime
 */
export function trimHapticDataFromSeekTime(
  events: HapticEvent[],
  curves: HapticCurve[],
  seekTime: number
): { events: HapticEvent[]; curves: HapticCurve[] } {
  'worklet';

  if (seekTime <= 0) {
    return { events, curves };
  }

  const trimmedEvents: HapticEvent[] = [];
  const trimmedCurves: HapticCurve[] = [];

  for (const event of events) {
    const trimmedEvent = trimEvent(event, seekTime);
    if (trimmedEvent) {
      trimmedEvents.push(trimmedEvent);
    }
  }

  for (const curve of curves) {
    const trimmedCurve = trimCurve(curve, seekTime);
    if (trimmedCurve) {
      trimmedCurves.push(trimmedCurve);
    }
  }

  return { events: trimmedEvents, curves: trimmedCurves };
}
