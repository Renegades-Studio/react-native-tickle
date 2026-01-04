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
  // State - events stored as object for fast lookup, array derived for iteration
  eventsById: Record<string, ComposerEvent>;
  eventIds: string[]; // Insertion order
  selectedEventId: string | null;
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
  selectEvent: (id: string | null) => void;
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
  // Events state - stored as object for O(1) lookup
  const [eventsById, setEventsById] = useState<Record<string, ComposerEvent>>(
    {}
  );
  const [eventIds, setEventIds] = useState<string[]>([]); // Maintains insertion order
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  // History for undo/redo - stores snapshots of {eventsById, eventIds}
  interface HistorySnapshot {
    eventsById: Record<string, ComposerEvent>;
    eventIds: string[];
  }
  const historyRef = useRef<HistorySnapshot[]>([]);
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
  const eventsByIdRef = useRef<Record<string, ComposerEvent>>({});
  const eventIdsRef = useRef<string[]>([]);
  eventsByIdRef.current = eventsById;
  eventIdsRef.current = eventIds;

  // Helper to get events array from current state
  const getEventsArray = (): ComposerEvent[] => {
    return eventIds.map((id) => eventsById[id]).filter(Boolean) as ComposerEvent[];
  };

  // ============================================
  // History functions
  // ============================================

  const updateHistoryFlags = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const pushToHistory = (
    newEventsById: Record<string, ComposerEvent>,
    newEventIds: string[]
  ) => {
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    historyRef.current.push({
      eventsById: { ...newEventsById },
      eventIds: [...newEventIds],
    });

    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    updateHistoryFlags();
  };

  const updateEventsWithHistory = (
    newEventsById: Record<string, ComposerEvent>,
    newEventIds: string[]
  ) => {
    setEventsById(newEventsById);
    setEventIds(newEventIds);
    pushToHistory(newEventsById, newEventIds);
    const eventsArray = newEventIds
      .map((id) => newEventsById[id])
      .filter(Boolean) as ComposerEvent[];
    totalDuration.set(getCompositionDuration(eventsArray));
  };

  // ============================================
  // Event actions
  // ============================================

  const addEvent = (type: 'transient' | 'continuous') => {
    const eventsArray = getEventsArray();
    const duration = getCompositionDuration(eventsArray);
    const newEvent =
      type === 'transient'
        ? createDefaultTransientEvent(duration)
        : createDefaultContinuousEvent(duration);

    const newEventsById = { ...eventsById, [newEvent.id]: newEvent };
    const newEventIds = [...eventIds, newEvent.id];
    updateEventsWithHistory(newEventsById, newEventIds);
    setSelectedEventId(newEvent.id);
  };

  const updateEvent = (id: string, updates: Partial<ComposerEvent>) => {
    const existingEvent = eventsById[id];
    if (!existingEvent) return;

    const updatedEvent = { ...existingEvent, ...updates } as ComposerEvent;
    const newEventsById = { ...eventsById, [id]: updatedEvent };
    updateEventsWithHistory(newEventsById, eventIds);
  };

  const deleteEvent = (id: string) => {
    const newEventsById = { ...eventsById };
    delete newEventsById[id];
    const newEventIds = eventIds.filter((eventId) => eventId !== id);
    updateEventsWithHistory(newEventsById, newEventIds);

    if (selectedEventId === id) {
      setSelectedEventId(null);
    }
  };

  const clearAllEvents = () => {
    updateEventsWithHistory({}, []);
    setSelectedEventId(null);
  };

  // ============================================
  // Selection actions
  // ============================================

  const selectEvent = (id: string | null) => {
    if (id === null || !eventsById[id]) {
      setSelectedEventId(null);
    } else {
      setSelectedEventId(id);
    }
  };

  const selectNextEvent = () => {
    if (eventIds.length === 0) return;
    if (selectedEventId === null) {
      setSelectedEventId(eventIds[0] ?? null);
    } else {
      const currentIndex = eventIds.indexOf(selectedEventId);
      if (currentIndex < eventIds.length - 1) {
        setSelectedEventId(eventIds[currentIndex + 1] ?? null);
      }
    }
  };

  const selectPreviousEvent = () => {
    if (eventIds.length === 0) return;
    if (selectedEventId === null) {
      setSelectedEventId(eventIds[eventIds.length - 1] ?? null);
    } else {
      const currentIndex = eventIds.indexOf(selectedEventId);
      if (currentIndex > 0) {
        setSelectedEventId(eventIds[currentIndex - 1] ?? null);
      }
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
        setEventsById(previousState.eventsById);
        setEventIds(previousState.eventIds);
        const eventsArray = previousState.eventIds
          .map((id) => previousState.eventsById[id])
          .filter(Boolean) as ComposerEvent[];
        totalDuration.set(getCompositionDuration(eventsArray));
      }
      updateHistoryFlags();
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      if (nextState) {
        setEventsById(nextState.eventsById);
        setEventIds(nextState.eventIds);
        const eventsArray = nextState.eventIds
          .map((id) => nextState.eventsById[id])
          .filter(Boolean) as ComposerEvent[];
        totalDuration.set(getCompositionDuration(eventsArray));
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

  const getEventsArrayFromRefs = (): ComposerEvent[] => {
    'worklet';
    return eventIdsRef.current
      .map((id) => eventsByIdRef.current[id])
      .filter(Boolean) as ComposerEvent[];
  };

  const playHapticsFromSeekTime = (seekTimeSeconds: number) => {
    'worklet';
    const currentEvents = getEventsArrayFromRefs();
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
    if (eventIdsRef.current.length === 0) return;

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
    const eventsArray = getEventsArray();
    const newComposition: Composition = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      events: eventsArray,
    };
    saveCompositions([...compositions, newComposition]);
    setSelectedCompositionId(newComposition.id);
  };

  const loadComposition = (id: string) => {
    const composition = compositions.find((c) => c.id === id);
    if (composition) {
      // Convert array to object format
      const newEventsById: Record<string, ComposerEvent> = {};
      const newEventIds: string[] = [];
      for (const event of composition.events) {
        newEventsById[event.id] = event;
        newEventIds.push(event.id);
      }

      setEventsById(newEventsById);
      setEventIds(newEventIds);
      totalDuration.set(getCompositionDuration(composition.events));
      setSelectedCompositionId(id);
      setSelectedEventId(null);

      // Reset history
      historyRef.current = [{ eventsById: newEventsById, eventIds: newEventIds }];
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
    const newEventsById: Record<string, ComposerEvent> = {};
    const newEventIds: string[] = [];

    for (const event of hapticEvents) {
      const intensity =
        event.parameters?.find((p) => p.type === 'intensity')?.value ?? 0.5;
      const sharpness =
        event.parameters?.find((p) => p.type === 'sharpness')?.value ?? 0.5;
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      if (event.type === 'transient') {
        newEventsById[id] = {
          id,
          type: 'transient' as const,
          startTime: event.relativeTime / 1000,
          intensity,
          sharpness,
        };
      } else {
        newEventsById[id] = {
          id,
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
      newEventIds.push(id);
    }

    updateEventsWithHistory(newEventsById, newEventIds);
    setSelectedEventId(null);
  };

  const exportEvents = (): { events: HapticEvent[]; curves: HapticCurve[] } => {
    const eventsArray = getEventsArray();
    const hapticEvents = eventsArray.map(composerEventToHapticEvent);
    const hapticCurves = composerEventsToCurves(eventsArray);
    return { events: hapticEvents, curves: hapticCurves };
  };

  return (
    <ComposerContext.Provider
      value={{
        eventsById,
        eventIds,
        selectedEventId,
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
