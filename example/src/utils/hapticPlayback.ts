import type { HapticEvent, HapticCurve } from 'react-native-tickle';

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

export function hapticEventsToRecordingEvents(
  events: HapticEvent[],
  curves?: HapticCurve[]
): Array<{
  type:
    | 'transient'
    | 'continuous_start'
    | 'continuous_update'
    | 'continuous_end';
  timestamp: number;
  intensity: number;
  sharpness: number;
}> {
  'worklet';

  const result: Array<{
    type:
      | 'transient'
      | 'continuous_start'
      | 'continuous_update'
      | 'continuous_end';
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
      const eventStart = event.relativeTime;
      const eventDuration = event.duration ?? 0;

      result.push({
        type: 'continuous_start',
        timestamp: eventStart,
        intensity,
        sharpness,
      });

      if (curves) {
        const intensityCurve = curves.find(
          (c) =>
            c.type === 'intensity' && Math.abs(c.relativeTime - eventStart) < 1
        );
        const sharpnessCurve = curves.find(
          (c) =>
            c.type === 'sharpness' && Math.abs(c.relativeTime - eventStart) < 1
        );

        const intensityPoints = intensityCurve?.controlPoints ?? [];
        const sharpnessPoints = sharpnessCurve?.controlPoints ?? [];

        const timestamps = new Set<number>();
        for (const pt of intensityPoints) {
          if (pt.relativeTime > 0) {
            timestamps.add(pt.relativeTime);
          }
        }
        for (const pt of sharpnessPoints) {
          if (pt.relativeTime > 0) {
            timestamps.add(pt.relativeTime);
          }
        }

        const sortedTimes = Array.from(timestamps).sort((a, b) => a - b);

        for (const t of sortedTimes) {
          let intensityValue = intensity;
          if (intensityPoints.length > 0) {
            const exactPoint = intensityPoints.find(
              (p) => Math.abs(p.relativeTime - t) < 1
            );
            if (exactPoint) {
              intensityValue = exactPoint.value;
            } else {
              let prev = intensityPoints[0];
              let next = intensityPoints[intensityPoints.length - 1];
              for (let i = 0; i < intensityPoints.length - 1; i++) {
                const p1 = intensityPoints[i];
                const p2 = intensityPoints[i + 1];
                if (p1 && p2 && p1.relativeTime <= t && p2.relativeTime >= t) {
                  prev = p1;
                  next = p2;
                  break;
                }
              }
              if (prev && next && next.relativeTime !== prev.relativeTime) {
                const ratio =
                  (t - prev.relativeTime) /
                  (next.relativeTime - prev.relativeTime);
                intensityValue = prev.value + ratio * (next.value - prev.value);
              }
            }
          }

          let sharpnessValue = sharpness;
          if (sharpnessPoints.length > 0) {
            const exactPoint = sharpnessPoints.find(
              (p) => Math.abs(p.relativeTime - t) < 1
            );
            if (exactPoint) {
              sharpnessValue = exactPoint.value;
            } else {
              let prev = sharpnessPoints[0];
              let next = sharpnessPoints[sharpnessPoints.length - 1];
              for (let i = 0; i < sharpnessPoints.length - 1; i++) {
                const p1 = sharpnessPoints[i];
                const p2 = sharpnessPoints[i + 1];
                if (p1 && p2 && p1.relativeTime <= t && p2.relativeTime >= t) {
                  prev = p1;
                  next = p2;
                  break;
                }
              }
              if (prev && next && next.relativeTime !== prev.relativeTime) {
                const ratio =
                  (t - prev.relativeTime) /
                  (next.relativeTime - prev.relativeTime);
                sharpnessValue = prev.value + ratio * (next.value - prev.value);
              }
            }
          }

          result.push({
            type: 'continuous_update',
            timestamp: eventStart + t,
            intensity: intensityValue,
            sharpness: sharpnessValue,
          });
        }
      }

      result.push({
        type: 'continuous_end',
        timestamp: eventStart + eventDuration,
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

    if (eventEnd <= seekTime) {
      return null;
    }

    if (event.relativeTime >= seekTime) {
      return {
        ...event,
        relativeTime: event.relativeTime - seekTime,
      };
    }

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

  if (curveEnd <= seekTime) {
    return null;
  }

  if (curve.relativeTime >= seekTime) {
    return {
      ...curve,
      relativeTime: curve.relativeTime - seekTime,
    };
  }

  const trimmedControlPoints: Array<{ relativeTime: number; value: number }> =
    [];

  const seekOffset = seekTime - curve.relativeTime;

  let prevPoint: { relativeTime: number; value: number } | null = null;

  for (const point of curve.controlPoints) {
    if (point.relativeTime >= seekOffset) {
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

  if (trimmedControlPoints.length === 0) {
    return null;
  }

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
