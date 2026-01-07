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

### Haptic "provider" (recommended)

Wrap your app inside `HapticProvider`. This initializes the engine and automatically destroys it when the app goes to background.

```tsx
import { HapticProvider } from 'react-native-ahaps';

export function App() {
  return <HapticProvider>{/* {Rest of your app} */}</HapticProvider>;
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
      duration: 1200,
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
        { relativeTime: 0, value: 0.2 },
        { relativeTime: 600, value: 1.0 },
        { relativeTime: 1200, value: 0.2 },
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
      relativeTime: 50,
      duration: 800,
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

Use this when you _can't_ predefine a pattern. You start the player, update it in real time, then stop it.

**Using the hook (recommended):**

```tsx
import { useContinuousPlayer } from 'react-native-ahaps';

function MyComponent() {
  const { start, stop, update } = useContinuousPlayer('my-player', 1.0, 0.5);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      start();
    })
    .onUpdate((e) => {
      update(e.translationY / 100, 0.5);
    })
    .onEnd(() => {
      stop();
    });
}
```

**Manual control:**

```ts
import {
  createContinuousPlayer,
  startContinuousPlayer,
  updateContinuousPlayer,
  stopContinuousPlayer,
  destroyContinuousPlayer,
} from 'react-native-ahaps';

const PLAYER_ID = 'my-player';

createContinuousPlayer(PLAYER_ID, 1.0, 0.5);
startContinuousPlayer(PLAYER_ID);
updateContinuousPlayer(PLAYER_ID, 0.8, 0.1);
stopContinuousPlayer(PLAYER_ID);
destroyContinuousPlayer(PLAYER_ID);
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

| Function                                                               | Purpose                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `HapticProvider`                                                       | Component that initializes engine; destroys on background       |
| `useHapticEngine()`                                                    | Hook to manage engine lifecycle (used internally by provider)   |
| `initializeEngine()` / `destroyEngine()`                               | Manual engine lifecycle                                         |
| `startHaptic(events, curves)`                                          | Play a pattern (transient + continuous events, optional curves) |
| `stopAllHaptics()`                                                     | Stop any running haptics (useful on unmount/navigation)         |
| `useContinuousPlayer(playerId, initialIntensity, initialSharpness)`    | Hook to manage a continuous player lifecycle                    |
| `createContinuousPlayer(playerId, initialIntensity, initialSharpness)` | Create a continuous player with given ID                        |
| `startContinuousPlayer(playerId)` / `stopContinuousPlayer(playerId)`   | Start/stop continuous playback for player                       |
| `updateContinuousPlayer(playerId, intensityControl, sharpnessControl)` | Update intensity/sharpness for player                           |
| `destroyContinuousPlayer(playerId)`                                    | Destroy player and release resources                            |

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

## Limitations

### Parameter curves affect all events in a pattern

In CoreHaptics, `CHHapticParameterCurve` uses `hapticIntensityControl` and `hapticSharpnessControl` — these are **pattern-level multipliers**, not per-event modifiers. Any curve you define will multiply the intensity/sharpness of **all events** playing at that moment, including transients.

**Example problem:**

```ts
startHaptic(
  [
    { type: 'continuous', relativeTime: 0, duration: 2000, parameters: [...] },
    { type: 'transient', relativeTime: 1000, parameters: [{ type: 'intensity', value: 1.0 }, ...] },
  ],
  [
    { type: 'intensity', relativeTime: 0, controlPoints: [
      { relativeTime: 0, value: 1.0 },
      { relativeTime: 1000, value: 0.3 },  // At t=1000ms, intensity control = 0.3
      { relativeTime: 2000, value: 0.3 },
    ]},
  ]
);
```

The transient at `t=1000ms` has base intensity `1.0`, but the curve sets `intensityControl=0.3` at that moment. **Effective intensity: 1.0 × 0.3 = 0.3**. The transient feels weaker than expected.

**Workaround:** Play continuous and transient events in separate `startHaptic()` calls:

```ts
// Continuous with curves
startHaptic(continuousEvents, curves);

// Transients without curves (separate pattern)
startHaptic(transientEvents, []);
```

Each call creates an isolated pattern/player — curves from one won't affect events in the other.

> **Note:** The library automatically resets control values to `1.0` at the end of each continuous event, so transients **after** a continuous event finishes are not affected. This limitation only applies to transients **during** a continuous event with active curves.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
