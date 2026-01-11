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
import { startHaptic, stopAllHaptics } from '@renegades/react-native-tickle';
import type { HapticEvent, HapticCurve } from '@renegades/react-native-tickle';
import {
  type ComposerEvent,
  createDefaultTransientEvent,
  createDefaultContinuousEvent,
  composerEventToHapticEvent,
  composerEventsToCurves,
  getCompositionDuration,
} from '../types/composer';
import { trimHapticDataFromSeekTime } from '../utils/hapticPlayback';
import { useCompositionsStore } from '../stores/compositionsStore';
import { useStateRef } from 'src/hooks/stateRef';

export const PIXELS_PER_SECOND = 100;

interface ComposerContextValue {
  eventsById: Record<string, ComposerEvent>;
  eventIds: string[];
  selectedEventId: string | null;
  currentCompositionId: string | null;
  isPlaying: SharedValue<boolean>;
  currentTime: SharedValue<number>;
  totalDuration: SharedValue<number>;
  scrollX: SharedValue<number>;
  isUserScrolling: SharedValue<boolean>;
  frameCallback: FrameCallback;
  addEvent: (type: 'transient' | 'continuous', startTime?: number) => void;
  updateEvent: (id: string, updates: Partial<ComposerEvent>) => void;
  deleteEvent: (id: string) => void;
  clearAllEvents: () => void;
  selectEvent: (id: string | null) => void;
  selectNextEvent: () => void;
  selectPreviousEvent: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  seekTo: (timeSeconds: number) => void;
  onUserScrollStart: () => void;
  onUserScrollEnd: () => void;
  loadComposition: (id: string) => void;
  createAndLoadComposition: () => string;
  importAndLoadComposition: (
    name: string,
    composerEvents: ComposerEvent[]
  ) => string;
  importEvents: (hapticEvents: HapticEvent[], curves?: HapticCurve[]) => void;
  exportEvents: () => { events: HapticEvent[]; curves: HapticCurve[] };
  saveToStore: () => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const compositions = useCompositionsStore((state) => state.compositions);
  const updateComposition = useCompositionsStore(
    (state) => state.updateComposition
  );
  const storeCreateComposition = useCompositionsStore(
    (state) => state.createComposition
  );
  const storeSelectComposition = useCompositionsStore(
    (state) => state.selectComposition
  );

  const [eventsById, setEventsById, eventsByIdRef] = useStateRef<
    Record<string, ComposerEvent>
  >({});
  const [eventIds, setEventIds, eventIdsRef] = useStateRef<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentCompositionId, setCurrentCompositionIdState] = useState<
    string | null
  >(null);
  const currentCompositionIdRef = useRef<string | null>(null);

  const setCurrentCompositionId = (id: string | null) => {
    currentCompositionIdRef.current = id;
    setCurrentCompositionIdState(id);
  };

  const isPlaying = useSharedValue(false);
  const currentTime = useSharedValue(0);
  const totalDuration = useSharedValue(0);
  const playbackStartTimestamp = useSharedValue(0);
  const playbackStartTime = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const isUserScrolling = useSharedValue(false);

  const getEventsArray = (): ComposerEvent[] => {
    return eventIds
      .map((id) => eventsById[id])
      .filter(Boolean) as ComposerEvent[];
  };

  const saveToStore = () => {
    const compositionId = currentCompositionIdRef.current;
    if (!compositionId) return;
    const eventsArray = eventIdsRef.current
      .map((id) => eventsByIdRef.current[id])
      .filter(Boolean) as ComposerEvent[];
    updateComposition(compositionId, eventsArray);
  };

  const updateEvents = (
    newEventsById: Record<string, ComposerEvent>,
    newEventIds: string[]
  ) => {
    setEventsById(newEventsById);
    setEventIds(newEventIds);
    const eventsArray = newEventIds
      .map((id) => newEventsById[id])
      .filter(Boolean) as ComposerEvent[];
    totalDuration.set(getCompositionDuration(eventsArray));
  };

  const loadComposition = (id: string) => {
    if (!id) {
      setEventsById({});
      setEventIds([]);
      setSelectedEventId(null);
      setCurrentCompositionId(null);
      storeSelectComposition(null);
      totalDuration.set(0);
      currentTime.set(0);
      scrollX.set(0);
      return;
    }

    const composition = compositions.find((c) => c.id === id);
    if (composition) {
      const newEventsById: Record<string, ComposerEvent> = {};
      const newEventIds: string[] = [];
      for (const event of composition.events) {
        newEventsById[event.id] = event;
        newEventIds.push(event.id);
      }
      setEventsById(newEventsById);
      setEventIds(newEventIds);
      setSelectedEventId(null);
      setCurrentCompositionId(id);
      storeSelectComposition(id);
      totalDuration.set(getCompositionDuration(composition.events));
      currentTime.set(0);
      scrollX.set(0);
    }
  };

  const createAndLoadComposition = (): string => {
    const newId = storeCreateComposition();
    setEventsById({});
    setEventIds([]);
    setSelectedEventId(null);
    setCurrentCompositionId(newId);
    totalDuration.set(0);
    currentTime.set(0);
    scrollX.set(0);
    return newId;
  };

  const importAndLoadComposition = (
    name: string,
    composerEvents: ComposerEvent[]
  ): string => {
    // Import to store and get the new ID
    const storeImportComposition =
      useCompositionsStore.getState().importComposition;
    const newId = storeImportComposition(name, composerEvents);

    // Directly load the events into context (don't look up from store)
    const newEventsById: Record<string, ComposerEvent> = {};
    const newEventIds: string[] = [];
    for (const event of composerEvents) {
      newEventsById[event.id] = event;
      newEventIds.push(event.id);
    }
    setEventsById(newEventsById);
    setEventIds(newEventIds);
    setSelectedEventId(null);
    setCurrentCompositionId(newId);
    storeSelectComposition(newId);
    totalDuration.set(getCompositionDuration(composerEvents));
    currentTime.set(0);
    scrollX.set(0);

    return newId;
  };

  const addEvent = (type: 'transient' | 'continuous', startTime?: number) => {
    const eventsArray = getEventsArray();
    const duration = getCompositionDuration(eventsArray);
    const eventStartTime = startTime ?? duration;
    const newEvent =
      type === 'transient'
        ? createDefaultTransientEvent(eventStartTime)
        : createDefaultContinuousEvent(eventStartTime);
    const newEventsById = { ...eventsById, [newEvent.id]: newEvent };
    const newEventIds = [...eventIds, newEvent.id];
    setEventsById(newEventsById);
    setEventIds(newEventIds);
    const updatedEventsArray = newEventIds
      .map((id) => newEventsById[id])
      .filter(Boolean) as ComposerEvent[];
    totalDuration.set(getCompositionDuration(updatedEventsArray));
    setSelectedEventId(newEvent.id);
  };

  const updateEvent = (id: string, updates: Partial<ComposerEvent>) => {
    const existingEvent = eventsById[id];
    if (!existingEvent) return;
    const updatedEvent = { ...existingEvent, ...updates } as ComposerEvent;
    const newEventsById = { ...eventsById, [id]: updatedEvent };
    updateEvents(newEventsById, eventIds);
  };

  const deleteEvent = (id: string) => {
    const newEventsById = { ...eventsById };
    delete newEventsById[id];
    const newEventIds = eventIds.filter((eventId) => eventId !== id);
    updateEvents(newEventsById, newEventIds);
    if (selectedEventId === id) {
      setSelectedEventId(null);
    }
  };

  const clearAllEvents = () => {
    updateEvents({}, []);
    setSelectedEventId(null);
  };

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

  const frameCallback = useFrameCallback(() => {
    if (!isPlaying.get()) return;

    const now = Date.now();
    const elapsed = (now - playbackStartTimestamp.get()) / 1000;
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

    const hapticEvents = currentEvents.map(composerEventToHapticEvent);
    const hapticCurves = composerEventsToCurves(currentEvents);

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
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);

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

    updateEvents(newEventsById, newEventIds);
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
        currentCompositionId,
        isPlaying,
        currentTime,
        totalDuration,
        scrollX,
        isUserScrolling,
        frameCallback,
        addEvent,
        updateEvent,
        deleteEvent,
        clearAllEvents,
        selectEvent,
        selectNextEvent,
        selectPreviousEvent,
        startPlayback,
        stopPlayback,
        seekTo,
        onUserScrollStart,
        onUserScrollEnd,
        loadComposition,
        createAndLoadComposition,
        importAndLoadComposition,
        importEvents,
        exportEvents,
        saveToStore,
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
