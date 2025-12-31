import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { RecordedHaptic } from '../types/recording';
import RecordingItem from './RecordingItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RecordingsListProps {
  recordings: RecordedHaptic[];
  selectedId: string | null;
  playingId: string | null;
  onSelect: (id: string | null) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function RecordingsList({
  recordings,
  selectedId,
  playingId,
  onSelect,
  onPlay,
  onPause,
  onDelete,
}: RecordingsListProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (id: string) => {
    // Toggle selection
    if (selectedId === id) {
      onSelect(null);
    } else {
      onSelect(id);
    }
  };

  if (recordings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recordings yet</Text>
        <Text style={styles.emptySubtext}>
          Tap RECORD to create your first haptic pattern
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recordings</Text>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingItem
            recording={item}
            isSelected={selectedId === item.id}
            isPlaying={playingId === item.id}
            onSelect={handleSelect}
            onPlay={onPlay}
            onPause={onPause}
            onDelete={onDelete}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
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
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
  },
});
