# react-native-ahaps

AHAP-style haptics (transient + continuous) on top of [Nitro Modules](https://nitro.margelo.com/) — the core functions are **UI-thread friendly** (`'worklet'`).

> iOS only (Core Haptics). Android support could be added in the future, but it’s currently unplanned.

## Installation

```sh
npm i react-native-ahaps react-native-nitro-modules
```

## Concepts (what to use when)

- **Transient**: Instant “click/tap” events. No duration — you trigger them at a point in time.
- **Continuous (pattern)**: Time-based patterns you _can_ define ahead of time. You provide **events** (with `duration`) and optionally **curves** (automation over time).
- **Continuous player (real-time)**: For _unpredictable_ input (gesture position, scroll velocity, real-time data). You create a player once, then **start → update (many times) → stop**.

### Why `events[]` and `curves[]` are separate

On iOS Core Haptics, a pattern is made of two different building blocks:

- **Events**: things that happen (transient “ticks” or continuous segments) at a `relativeTime`, with base `intensity`/`sharpness`.
- **Curves**: how parameters (intensity/sharpness) evolve over time via control points, independent of “what event” is currently playing.

They’re separate because they’re different object types in Core Haptics (events vs parameter curves) and they serve different jobs: **events define the structure**, **curves define the modulation**. You often combine both in one pattern.

## Usage

### Haptic “provider” (recommended)

Wrap your app inside `HapticsProvider`. This initializes the engine, creates the continuous player, and automatically destroys the engine when the app goes to background.

```tsx
import { HapticsProvider } from 'react-native-ahaps';

export function App() {
  return <HapticsProvider>{/* {Rest of your app} */}</HapticsProvider>;
}
```

### `startHaptic(events, curves)` (transient + continuous patterns)

Play a transient:

```ts
import { startHaptic } from 'react-native-ahaps';

startHaptic(
  [
    {
      type: 'transient',
      relativeTime: 0,
      parameters: [
        { type: 'intensity', value: 1 },
        { type: 'sharpness', value: 0.5 },
      ],
    },
  ],
  []
);
```

Play a continuous pattern (events + curves together):

```ts
import { startHaptic } from 'react-native-ahaps';

startHaptic(
  [
    {
      type: 'continuous',
      relativeTime: 0,
      duration: 1.2,
      parameters: [
        { type: 'intensity', value: 0.2 },
        { type: 'sharpness', value: 0.5 },
      ],
    },
  ],
  [
    {
      type: 'intensity',
      relativeTime: 0,
      controlPoints: [
        { relativeTime: 0.0, value: 0.2 },
        { relativeTime: 0.6, value: 1.0 },
        { relativeTime: 1.2, value: 0.2 },
      ],
    },
  ]
);
```

Combine transient + continuous in one pattern:

```ts
import { startHaptic } from 'react-native-ahaps';

startHaptic(
  [
    {
      type: 'transient',
      relativeTime: 0,
      parameters: [
        { type: 'intensity', value: 1 },
        { type: 'sharpness', value: 0.8 },
      ],
    },
    {
      type: 'continuous',
      relativeTime: 0.05,
      duration: 0.8,
      parameters: [
        { type: 'intensity', value: 0.2 },
        { type: 'sharpness', value: 0.4 },
      ],
    },
  ],
  []
);
```

### Real-time continuous mode (continuous player)

Use this when you _can’t_ predefine a pattern. You start the player, update it in real time, then stop it.

```ts
import {
  createContinuousPlayer,
  startContinuousPlayer,
  updateContinuousPlayer,
  stopContinuousPlayer,
} from 'react-native-ahaps';

createContinuousPlayer(1.0, 0.5);
startContinuousPlayer();
updateContinuousPlayer(0.8, 0.1);
stopContinuousPlayer();
```

### Opt out of the provider (manual engine control)

If you don’t want the provider behavior:

```ts
import { initializeEngine, destroyEngine } from 'react-native-ahaps';

initializeEngine();
// ...
destroyEngine();
```

### Stop everything (recommended in screen cleanups)

Call `stopAllHaptics()` in your cleanup functions to terminate any ongoing continuous haptics. This prevents haptics from bleeding through to the next screen when navigating.

```ts
import { stopAllHaptics } from 'react-native-ahaps';
import { useEffect } from 'react';

export function SomeScreen() {
  useEffect(() => () => stopAllHaptics(), []);
  return null;
}
```

## API (tables)

| Function                                                     | Purpose                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `useHapticEngine(options?)`                                  | Initialize engine + continuous player; destroy engine on background |
| `initializeEngine()` / `destroyEngine()`                     | Manual engine lifecycle                                             |
| `startHaptic(events, curves)`                                | Play a pattern (transient + continuous events, optional curves)     |
| `stopAllHaptics()`                                           | Stop any running haptics (useful on unmount/navigation)             |
| `createContinuousPlayer(initialIntensity, initialSharpness)` | Create the real-time continuous player                              |
| `startContinuousPlayer()` / `stopContinuousPlayer()`         | Start/stop real-time continuous playback                            |
| `updateContinuousPlayer(intensityControl, sharpnessControl)` | Update real-time intensity/sharpness                                |

## Types (inputs)

| Type                  | Values                       |
| --------------------- | ---------------------------- |
| `HapticParameterType` | `'intensity' \| 'sharpness'` |

| `HapticEventParameter` | Type                  |
| ---------------------- | --------------------- |
| `type`                 | `HapticParameterType` |
| `value`                | `number`              |

**`HapticEvent`** (discriminated union)

- **Transient:**

  - `type`: `'transient'`
  - `relativeTime`: `number`
  - `parameters`: `HapticEventParameter[]`

- **Continuous:**
  - `type`: `'continuous'`
  - `relativeTime`: `number`
  - `duration`: `number`
  - `parameters`: `HapticEventParameter[]`

| `HapticCurveControlPoint` | Type     |
| ------------------------- | -------- |
| `relativeTime`            | `number` |
| `value`                   | `number` |

| `HapticCurve`   | Type                        |
| --------------- | --------------------------- |
| `type`          | `HapticCurveType`           |
| `relativeTime`  | `number`                    |
| `controlPoints` | `HapticCurveControlPoint[]` |

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
