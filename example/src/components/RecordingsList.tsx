import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { RecordedHaptic } from '../types/recording';
import RecordingItem from './RecordingItem';

interface RecordingsListProps {
  recordings: RecordedHaptic[];
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function RecordingsList({
  recordings,
  onPlay,
  onDelete,
}: RecordingsListProps) {
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
            onPlay={onPlay}
            onDelete={onDelete}
          />
        )}
        contentContainerStyle={styles.listContent}
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
  listContent: {
    paddingBottom: 16,
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

