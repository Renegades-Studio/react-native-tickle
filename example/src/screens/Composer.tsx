import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useComposer } from '../contexts/ComposerContext';
import { useTheme } from '../contexts/ThemeContext';
import ComposerTimeline from '../components/ComposerTimeline';
import EventNavigation from '../components/EventNavigation';
import EventEditorPanel from '../components/EventEditorPanel';
import ComposerActionBar from '../components/ComposerActionBar';
import { type ComposerEvent } from '../types/composer';
import ReText from '../components/ReText';
import { scheduleOnRN } from 'react-native-worklets';
import { router } from 'expo-router';

export function Composer() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
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
    selectEvent,
    selectNextEvent,
    selectPreviousEvent,
    startPlayback,
    stopPlayback,
    seekTo,
    onUserScrollStart,
    onUserScrollEnd,
    createAndLoadComposition,
    saveToStore,
  } = useComposer();

  const appState = useRef(AppState.currentState);

  // Save to store when screen loses focus (user navigates away)
  useFocusEffect(
    useCallback(() => {
      return () => {
        saveToStore();
      };
    }, [])
  );

  // Save to store when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        saveToStore();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [saveToStore]);

  const [showAddModal, setShowAddModal] = useState(false);

  // Derive events array for components that need it
  const events = eventIds
    .map((id) => eventsById[id])
    .filter(Boolean) as ComposerEvent[];
  const selectedEvent = selectedEventId
    ? eventsById[selectedEventId] ?? null
    : null;

  // Navigation state
  const selectedIndex = selectedEventId
    ? eventIds.indexOf(selectedEventId)
    : -1;
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < eventIds.length - 1;

  // Time display text
  const timeText = useDerivedValue(() => {
    const current = currentTime.get().toFixed(2);
    const total = totalDuration.get().toFixed(1);
    return `Time: ${current}s / ${total}s`;
  });

  // Helper to update frame callback state
  const setFrameCallbackActive = (active: boolean) => {
    frameCallback.setActive(active);
  };

  // Handle play/pause toggle
  const handlePlayToggle = () => {
    'worklet';
    if (isPlaying.get()) {
      stopPlayback();
      scheduleOnRN(setFrameCallbackActive, false);
    } else {
      scheduleOnRN(setFrameCallbackActive, true);
      startPlayback();
    }
  };

  // Handle event update
  const handleUpdateEvent = (updates: Partial<ComposerEvent>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, updates);
    }
  };

  // Handle type change (convert between transient and continuous)
  const handleTypeChange = (type: 'transient' | 'continuous') => {
    if (!selectedEvent || selectedEvent.type === type) return;

    const baseProps = {
      startTime: selectedEvent.startTime,
      intensity: selectedEvent.intensity,
      sharpness: selectedEvent.sharpness,
    };

    if (type === 'transient') {
      updateEvent(selectedEvent.id, {
        type: 'transient',
        ...baseProps,
      });
    } else {
      updateEvent(selectedEvent.id, {
        type: 'continuous',
        ...baseProps,
        duration: 0.5,
        fadeInIntensity: 0,
        fadeInDuration: 0,
        fadeOutIntensity: 0,
        fadeOutDuration: 0,
      } as ComposerEvent);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (selectedEvent) {
      deleteEvent(selectedEvent.id);
    }
  };

  const handleAddTransient = () => {
    setShowAddModal(false);
    if (!currentCompositionId) {
      createAndLoadComposition();
    }
    const playheadTime = currentTime.get();
    addEvent('transient', playheadTime);
  };

  const handleAddContinuous = () => {
    setShowAddModal(false);
    if (!currentCompositionId) {
      createAndLoadComposition();
    }
    const playheadTime = currentTime.get();
    addEvent('continuous', playheadTime);
  };

  // Handle seek from timeline
  const handleSeek = (timeSeconds: number) => {
    'worklet';
    seekTo(timeSeconds);
  };

  // Handle pause from timeline (when user starts scrolling during playback)
  const handlePause = () => {
    'worklet';
    stopPlayback();
    scheduleOnRN(setFrameCallbackActive, false);
  };

  // Close editor panel (deselect)
  const handleCloseEditor = () => {
    selectEvent(null);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.text }]}>
        Timeline Editor
      </Text>

      {/* Time display */}
      <ReText
        text={timeText}
        style={[styles.timeText, { color: colors.secondaryText }]}
      />

      {/* Timeline */}
      <ComposerTimeline
        events={events}
        selectedEventId={selectedEventId}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        scrollX={scrollX}
        isUserScrolling={isUserScrolling}
        onSelectEvent={selectEvent}
        onSeek={handleSeek}
        onPause={handlePause}
        onUserScrollStart={onUserScrollStart}
        onUserScrollEnd={onUserScrollEnd}
      />

      {/* Event Navigation */}
      <EventNavigation
        hasSelection={selectedEventId !== null}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={selectPreviousEvent}
        onNext={selectNextEvent}
      />

      {/* Event Editor Panel */}
      <EventEditorPanel
        event={selectedEvent ?? null}
        onUpdateEvent={handleUpdateEvent}
        onChangeType={handleTypeChange}
        onClose={handleCloseEditor}
      />

      {/* Action Bar */}
      <ComposerActionBar
        isPlaying={isPlaying}
        canPlay={eventIds.length > 0}
        hasSelection={selectedEventId !== null}
        onPlay={handlePlayToggle}
        onAdd={() => setShowAddModal(true)}
        onDelete={handleDelete}
        onList={() => router.push('/compositions-list')}
      />

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Event
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#FF8C32' }]}
              onPress={handleAddTransient}
            >
              <Text style={styles.modalButtonText}>Transient</Text>
              <Text
                style={[
                  styles.modalButtonDesc,
                  { color: 'rgba(255,255,255,0.8)' },
                ]}
              >
                Quick, sharp haptic tap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.blue }]}
              onPress={handleAddContinuous}
            >
              <Text style={styles.modalButtonText}>Continuous</Text>
              <Text
                style={[
                  styles.modalButtonDesc,
                  { color: 'rgba(255,255,255,0.8)' },
                ]}
              >
                Sustained haptic with duration
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtonDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
