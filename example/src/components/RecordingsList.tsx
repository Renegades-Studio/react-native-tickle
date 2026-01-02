import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import type { RecordedHaptic } from '../types/recording';
import RecordingItem from './RecordingItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useState } from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../contexts/ThemeContext';

interface RecordingsListProps {
  recordings: RecordedHaptic[];
  selectedId: string | null;
  isPlaying: SharedValue<boolean>;
  onSelect: (id: string | null) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
}

export default function RecordingsList({
  recordings,
  selectedId,
  isPlaying,
  onSelect,
  onPlay,
  onPause,
  onDelete,
  onNameChange,
}: RecordingsListProps) {
  const { colors } = useTheme();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useAnimatedReaction(
    () => isPlaying.get(),
    (isPlaying) => {
      if (isPlaying && selectedId) {
        scheduleOnRN(setPlayingId, selectedId);
      } else {
        scheduleOnRN(setPlayingId, null);
      }
    }
  );

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      onSelect(null);
    } else {
      onSelect(id);
    }
  };

  if (recordings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
          No recordings yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.tertiaryText }]}>
          Create a new haptic pattern or import an existing one
        </Text>
        <View style={styles.emptyButtonsContainer}>
          <Link href="/import-modal" asChild>
            <TouchableOpacity
              style={[
                styles.emptyButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.timelineGrid,
                },
              ]}
            >
              <Text style={styles.emptyButtonIcon}>📁</Text>
              <Text style={[styles.emptyButtonText, { color: colors.text }]}>
                Import
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardStickyView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Recordings</Text>
        <Link href="/import-modal" asChild>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.blue }]}
          >
            <Text style={[styles.addButtonText, { color: colors.text }]}>
              +
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <RecordingItem
            recording={item}
            isSelected={selectedId === item.id}
            isPlaying={playingId === item.id}
            onSelect={handleSelect}
            onPlay={onPlay}
            onPause={onPause}
            onDelete={onDelete}
            onNameChange={onNameChange}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderWidth: 1,
  },
  emptyButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
