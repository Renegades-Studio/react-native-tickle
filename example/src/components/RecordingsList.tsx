import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import type { RecordedHaptic } from '../types/recording';
import RecordingItem from './RecordingItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

interface RecordingsListProps {
  recordings: RecordedHaptic[];
  selectedId: string | null;
  playingId: string | null;
  onSelect: (id: string | null) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
}

export default function RecordingsList({
  recordings,
  selectedId,
  playingId,
  onSelect,
  onPlay,
  onPause,
  onDelete,
  onNameChange,
}: RecordingsListProps) {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.emptyText}>No recordings yet</Text>
        <Text style={styles.emptySubtext}>
          Tap RECORD to create your first haptic pattern
        </Text>
      </View>
    );
  }

  return (
    <KeyboardStickyView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recordings</Text>
        <Link href="/import-modal" asChild>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
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
    backgroundColor: '#000',
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
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
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
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
  },
});
