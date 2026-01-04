import {
  createContext,
  useContext,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import {
  useSharedValue,
  useFrameCallback,
  type SharedValue,
  type FrameCallback,
} from 'react-native-reanimated';
import { startHaptic, stopAllHaptics } from 'react-native-ahaps';
import type { HapticEvent, HapticCurve } from 'react-native-ahaps';
import {
  type ComposerEvent,
  type Composition,
  createDefaultTransientEvent,
  createDefaultContinuousEvent,
  composerEventToHapticEvent,
  composerEventsToCurves,
  getCompositionDuration,
} from '../types/composer';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { trimHapticDataFromSeekTime } from '../utils/hapticPlayback';

// Pixels per second for timeline (Composer uses seconds, not milliseconds)
export const PIXELS_PER_SECOND = 100;

const MAX_HISTORY_SIZE = 50;

interface ComposerContextValue {
  // State
  events: ComposerEvent[];
  selectedEventIndex: number | null;
  compositions: Composition[];
  selectedCompositionId: string | null;

  // Playback state (shared values for UI thread)
  isPlaying: SharedValue<boolean>;
  currentTime: SharedValue<number>; // in seconds
  totalDuration: SharedValue<number>; // in seconds
  scrollX: SharedValue<number>; // in pixels
  isUserScrolling: SharedValue<boolean>;
  frameCallback: FrameCallback;

  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;

  // Event actions
  addEvent: (type: 'transient' | 'continuous') => void;
  updateEvent: (id: string, updates: Partial<ComposerEvent>) => void;
  deleteEvent: (id: string) => void;
  clearAllEvents: () => void;

  // Selection actions
  selectEvent: (index: number | null) => void;
  selectNextEvent: () => void;
  selectPreviousEvent: () => void;

  // History actions
  undo: () => void;
  redo: () => void;

  // Playback actions (worklets)
  startPlayback: () => void;
  stopPlayback: () => void;
  seekTo: (timeSeconds: number) => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;

  // Composition actions
  saveComposition: (name: string) => void;
  loadComposition: (id: string) => void;
  deleteComposition: (id: string) => void;
  importEvents: (hapticEvents: HapticEvent[], curves?: HapticCurve[]) => void;
  exportEvents: () => { events: HapticEvent[]; curves: HapticCurve[] };
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  // Events state
  const [events, setEvents] = useState<ComposerEvent[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null
  );

  // Compositions state (persisted)
  const [compositions, setCompositions] = useState<Composition[]>(() => {
    try {
      const stored = storage.getString(STORAGE_KEYS.COMPOSITIONS);
      if (stored) {
        return JSON.parse(stored) as Composition[];
      }
    } catch (error) {
      console.error('Failed to load compositions from storage:', error);
    }
    return [];
  });
  const [selectedCompositionId, setSelectedCompositionId] = useState<
    string | null
  >(null);

  // History for undo/redo
  const historyRef = useRef<ComposerEvent[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Playback state - all SharedValues for UI thread access
  const isPlaying = useSharedValue(false);
  const currentTime = useSharedValue(0); // seconds
  const totalDuration = useSharedValue(0); // seconds
  const playbackStartTimestamp = useSharedValue(0);
  const playbackStartTime = useSharedValue(0); // seconds
  const scrollX = useSharedValue(0); // pixels
  const isUserScrolling = useSharedValue(false);

  // Store events ref for worklet access
  const eventsRef = useRef<ComposerEvent[]>([]);
  eventsRef.current = events;

  // ============================================
  // History functions
  // ============================================

  const updateHistoryFlags = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const pushToHistory = (newEvents: ComposerEvent[]) => {
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    historyRef.current.push([...newEvents]);

    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    updateHistoryFlags();
  };

  const sortEvents = (eventList: ComposerEvent[]): ComposerEvent[] => {
    return [...eventList].sort((a, b) => a.startTime - b.startTime);
  };

  const updateEventsWithHistory = (newEvents: ComposerEvent[]) => {
    const sorted = sortEvents(newEvents);
    setEvents(sorted);
    pushToHistory(sorted);
    totalDuration.set(getCompositionDuration(sorted));
  };

  // ============================================
  // Event actions
  // ============================================

  const addEvent = (type: 'transient' | 'continuous') => {
    const duration = getCompositionDuration(events);
    const newEvent =
      type === 'transient'
        ? createDefaultTransientEvent(duration)
        : createDefaultContinuousEvent(duration);

    const newEvents = [...events, newEvent];
    updateEventsWithHistory(newEvents);

    const sortedEvents = sortEvents(newEvents);
    const newIndex = sortedEvents.findIndex((e) => e.id === newEvent.id);
    setSelectedEventIndex(newIndex);
  };

  const updateEvent = (id: string, updates: Partial<ComposerEvent>) => {
    const newEvents = events.map((event) => {
      if (event.id === id) {
        return { ...event, ...updates } as ComposerEvent;
      }
      return event;
    });
    updateEventsWithHistory(newEvents);
  };

  const deleteEvent = (id: string) => {
    const newEvents = events.filter((event) => event.id !== id);
    updateEventsWithHistory(newEvents);

    if (selectedEventIndex !== null) {
      if (newEvents.length === 0) {
        setSelectedEventIndex(null);
      } else if (selectedEventIndex >= newEvents.length) {
        setSelectedEventIndex(newEvents.length - 1);
      }
    }
  };

  const clearAllEvents = () => {
    updateEventsWithHistory([]);
    setSelectedEventIndex(null);
  };

  // ============================================
  // Selection actions
  // ============================================

  const selectEvent = (index: number | null) => {
    if (index === null || index < 0 || index >= events.length) {
      setSelectedEventIndex(null);
    } else {
      setSelectedEventIndex(index);
    }
  };

  const selectNextEvent = () => {
    if (events.length === 0) return;
    if (selectedEventIndex === null) {
      setSelectedEventIndex(0);
    } else if (selectedEventIndex < events.length - 1) {
      setSelectedEventIndex(selectedEventIndex + 1);
    }
  };

  const selectPreviousEvent = () => {
    if (events.length === 0) return;
    if (selectedEventIndex === null) {
      setSelectedEventIndex(events.length - 1);
    } else if (selectedEventIndex > 0) {
      setSelectedEventIndex(selectedEventIndex - 1);
    }
  };

  // ============================================
  // Undo/Redo
  // ============================================

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      if (previousState) {
        setEvents(previousState);
        totalDuration.set(getCompositionDuration(previousState));
      }
      updateHistoryFlags();
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      if (nextState) {
        setEvents(nextState);
        totalDuration.set(getCompositionDuration(nextState));
      }
      updateHistoryFlags();
    }
  };

  // ============================================
  // Frame callback for playback
  // ============================================

  const frameCallback = useFrameCallback(() => {
    if (!isPlaying.get()) return;

    const now = Date.now();
    const elapsed = (now - playbackStartTimestamp.get()) / 1000; // seconds
    const newTime = playbackStartTime.get() + elapsed;
    const maxTime = totalDuration.get();

    if (newTime >= maxTime) {
      currentTime.set(maxTime);
      scrollX.set(maxTime * PIXELS_PER_SECOND);
      isPlaying.set(false);
      stopAllHaptics();
    } else {
      currentTime.set(newTime);
      scrollX.set(newTime * PIXELS_PER_SECOND);
    }
  }, false);

  // ============================================
  // Playback worklet functions
  // ============================================

  const playHapticsFromSeekTime = (seekTimeSeconds: number) => {
    'worklet';
    const currentEvents = eventsRef.current;
    if (currentEvents.length === 0) return;

    // Convert composer events to haptic events (in milliseconds)
    const hapticEvents = currentEvents.map(composerEventToHapticEvent);
    const hapticCurves = composerEventsToCurves(currentEvents);

    // Trim events from seek position (convert seconds to milliseconds)
    const seekTimeMs = seekTimeSeconds * 1000;
    const { events: trimmedEvents, curves: trimmedCurves } =
      trimHapticDataFromSeekTime(hapticEvents, hapticCurves, seekTimeMs);

    startHaptic(trimmedEvents, trimmedCurves);
  };

  const startPlayback = () => {
    'worklet';
    if (eventsRef.current.length === 0) return;

    const current = currentTime.get();
    const max = totalDuration.get();

    let startFrom: number;
    if (current >= max) {
      startFrom = 0;
      currentTime.set(0);
      scrollX.set(0);
    } else {
      startFrom = current;
    }

    playbackStartTime.set(startFrom);
    playbackStartTimestamp.set(Date.now());
    isPlaying.set(true);

    playHapticsFromSeekTime(startFrom);
  };

  const stopPlayback = () => {
    'worklet';
    isPlaying.set(false);
    stopAllHaptics();
  };

  const seekTo = (timeSeconds: number) => {
    'worklet';
    if (isPlaying.get()) {
      isPlaying.set(false);
      stopAllHaptics();
    }

    const clampedTime = Math.max(0, Math.min(timeSeconds, totalDuration.get()));
    currentTime.set(clampedTime);
  };

  const onUserScrollStart = () => {
    'worklet';
    isUserScrolling.set(true);
  };

  const onUserScrollEnd = () => {
    'worklet';
    isUserScrolling.set(false);
    const time = currentTime.get();
    scrollX.set(time * PIXELS_PER_SECOND);
  };

  // ============================================
  // Composition actions
  // ============================================

  const saveCompositions = (newCompositions: Composition[]) => {
    storage.set(STORAGE_KEYS.COMPOSITIONS, JSON.stringify(newCompositions));
    setCompositions(newCompositions);
  };

  const saveComposition = (name: string) => {
    const newComposition: Composition = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      events: [...events],
    };
    saveCompositions([...compositions, newComposition]);
    setSelectedCompositionId(newComposition.id);
  };

  const loadComposition = (id: string) => {
    const composition = compositions.find((c) => c.id === id);
    if (composition) {
      setEvents(composition.events);
      totalDuration.set(getCompositionDuration(composition.events));
      setSelectedCompositionId(id);
      setSelectedEventIndex(null);

      // Reset history
      historyRef.current = [composition.events];
      historyIndexRef.current = 0;
      updateHistoryFlags();
    }
  };

  const deleteComposition = (id: string) => {
    const newCompositions = compositions.filter((c) => c.id !== id);
    saveCompositions(newCompositions);
    if (selectedCompositionId === id) {
      setSelectedCompositionId(null);
    }
  };

  // ============================================
  // Import/Export
  // ============================================

  const importEvents = (
    hapticEvents: HapticEvent[],
    _curves?: HapticCurve[]
  ) => {
    const composerEvents: ComposerEvent[] = hapticEvents.map((event) => {
      const intensity =
        event.parameters?.find((p) => p.type === 'intensity')?.value ?? 0.5;
      const sharpness =
        event.parameters?.find((p) => p.type === 'sharpness')?.value ?? 0.5;

      if (event.type === 'transient') {
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'transient' as const,
          startTime: event.relativeTime / 1000,
          intensity,
          sharpness,
        };
      } else {
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'continuous' as const,
          startTime: event.relativeTime / 1000,
          duration: (event.duration ?? 0) / 1000,
          intensity,
          sharpness,
          fadeInIntensity: 0,
          fadeInDuration: 0,
          fadeOutIntensity: 0,
          fadeOutDuration: 0,
        };
      }
    });

    updateEventsWithHistory(composerEvents);
    setSelectedEventIndex(null);
  };

  const exportEvents = (): { events: HapticEvent[]; curves: HapticCurve[] } => {
    const hapticEvents = events.map(composerEventToHapticEvent);
    const hapticCurves = composerEventsToCurves(events);
    return { events: hapticEvents, curves: hapticCurves };
  };

  return (
    <ComposerContext.Provider
      value={{
        events,
        selectedEventIndex,
        compositions,
        selectedCompositionId,
        isPlaying,
        currentTime,
        totalDuration,
        scrollX,
        isUserScrolling,
        frameCallback,
        canUndo,
        canRedo,
        addEvent,
        updateEvent,
        deleteEvent,
        clearAllEvents,
        selectEvent,
        selectNextEvent,
        selectPreviousEvent,
        undo,
        redo,
        startPlayback,
        stopPlayback,
        seekTo,
        onUserScrollStart,
        onUserScrollEnd,
        saveComposition,
        loadComposition,
        deleteComposition,
        importEvents,
        exportEvents,
      }}
    >
      {children}
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error('useComposer must be used within ComposerProvider');
  }
  return context;
}
