import { useCallback, useEffect } from 'react';
import {
  Easing,
  type SharedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface TimerConfig {
  /** Whether the timer should start automatically. @default false */
  autoStart?: boolean;
  /** The duration of the timer in milliseconds. @default 1000 */
  durationMs?: number;
  /** A worklet function to be called when the timer ends. */
  onEndWorklet?: () => void;
  /** A worklet function to be called when the timer starts. */
  onStartWorklet?: (currentTime: SharedValue<number>) => void;
  /** Whether the timer should repeat after completion. @default false */
  shouldRepeat?: boolean;
}

interface TimerResult {
  /** A worklet function that pauses the timer. */
  pause: () => void;
  /** A worklet function that restarts the timer. */
  restart: () => void;
  /** A worklet function that starts the timer. */
  start: () => void;
  /** A worklet function that stops the timer. */
  stop: () => void;
  /** A shared value representing the timer clock in seconds. */
  timeInSeconds: SharedValue<number>;
}

export function useAnimatedTime(config: TimerConfig = {}): TimerResult {
  const {
    autoStart = false,
    durationMs = 1000,
    onEndWorklet,
    onStartWorklet,
    shouldRepeat = false,
  } = config;

  const pausedAt = useSharedValue(0);
  const timeInSeconds = useSharedValue(0);

  const start = useCallback(() => {
    'worklet';

    if (onStartWorklet) onStartWorklet(timeInSeconds);

    const repeatingTimer = withRepeat(
      withTiming(
        durationMs / 1000,
        { duration: durationMs, easing: Easing.linear },
        (finished) => {
          if (finished && onEndWorklet) {
            onEndWorklet();
          }
        }
      ),
      shouldRepeat ? -1 : 1,
      false
    );

    if (pausedAt.get() > 0) {
      const remainingMs = durationMs - pausedAt.get() * 1000;
      pausedAt.set(0);

      timeInSeconds.set(
        withSequence(
          withTiming(
            durationMs / 1000,
            {
              duration: remainingMs,
              easing: Easing.linear,
            },
            (finished) => {
              if (finished && onEndWorklet) {
                onEndWorklet();
              }
            }
          ),
          repeatingTimer
        )
      );
    } else {
      if (timeInSeconds.get() > 0) {
        timeInSeconds.set(0);
      }
      timeInSeconds.set(repeatingTimer);
    }
  }, [
    durationMs,
    onEndWorklet,
    onStartWorklet,
    pausedAt,
    shouldRepeat,
    timeInSeconds,
  ]);

  const stop = useCallback(() => {
    'worklet';
    pausedAt.set(0);
    timeInSeconds.set(0);
  }, [pausedAt, timeInSeconds]);

  const pause = useCallback(() => {
    'worklet';
    const currentTime = timeInSeconds.get();
    pausedAt.set(currentTime);
    timeInSeconds.set(currentTime);
  }, [pausedAt, timeInSeconds]);

  const restart = useCallback(() => {
    'worklet';
    stop();
    start();
  }, [start, stop]);

  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, []);

  return {
    pause,
    restart,
    start,
    stop,
    timeInSeconds,
  };
}
