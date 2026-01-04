import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue } from 'react-native-reanimated';
import { useComposer } from '../contexts/ComposerContext';
import { useTheme } from '../contexts/ThemeContext';
import ComposerTimeline from '../components/ComposerTimeline';
import EventNavigation from '../components/EventNavigation';
import EventEditorPanel from '../components/EventEditorPanel';
import ComposerActionBar from '../components/ComposerActionBar';
import { type ComposerEvent } from '../types/composer';
import ReText from '../components/ReText';
import { scheduleOnRN } from 'react-native-worklets';

export function Composer() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    events,
    selectedEventIndex,
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
    exportEvents,
  } = useComposer();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const selectedEvent =
    selectedEventIndex !== null ? events[selectedEventIndex] : null;

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

  // Handle add new event
  const handleAddTransient = () => {
    setShowAddModal(false);
    addEvent('transient');
  };

  const handleAddContinuous = () => {
    setShowAddModal(false);
    addEvent('continuous');
  };

  // Handle export
  const handleExport = async () => {
    setShowMoreModal(false);
    try {
      const { events: hapticEvents, curves } = exportEvents();
      const exportData = { events: hapticEvents, curves };
      const jsonData = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonData,
        title: 'Export Haptic Pattern',
      });
    } catch (error) {
      console.error('Export error:', error);
    }
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
        Haptic Composer
      </Text>

      {/* Time display */}
      <ReText
        text={timeText}
        style={[styles.timeText, { color: colors.secondaryText }]}
      />

      {/* Timeline */}
      <ComposerTimeline
        events={events}
        selectedEventIndex={selectedEventIndex}
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
        selectedEventIndex={selectedEventIndex}
        totalEvents={events.length}
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
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedEventIndex !== null}
        onPlay={handlePlayToggle}
        onUndo={undo}
        onRedo={redo}
        onAdd={() => setShowAddModal(true)}
        onDelete={handleDelete}
        onMore={() => setShowMoreModal(true)}
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

      {/* More Options Modal */}
      <Modal
        visible={showMoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Options
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.green }]}
              onPress={handleExport}
            >
              <Text style={styles.modalButtonText}>Export Pattern</Text>
              <Text
                style={[
                  styles.modalButtonDesc,
                  { color: 'rgba(255,255,255,0.8)' },
                ]}
              >
                Share as JSON
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.blue }]}
              onPress={() => {
                setShowMoreModal(false);
                Alert.alert('Import', 'Use the Import button from the menu');
              }}
            >
              <Text style={styles.modalButtonText}>Import Pattern</Text>
              <Text
                style={[
                  styles.modalButtonDesc,
                  { color: 'rgba(255,255,255,0.8)' },
                ]}
              >
                Load from JSON
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
