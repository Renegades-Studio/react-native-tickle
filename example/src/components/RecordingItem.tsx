import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { RecordedHaptic } from '../types/recording';

interface RecordingItemProps {
  recording: RecordedHaptic;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function RecordingItem({
  recording,
  onPlay,
  onDelete,
}: RecordingItemProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{recording.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {formatDuration(recording.duration)}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.metaText}>{formatDate(recording.createdAt)}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.metaText}>
            {recording.events.length} event
            {recording.events.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.playButton]}
          onPress={() => onPlay(recording.id)}
        >
          <Text style={styles.buttonText}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => onDelete(recording.id)}
        >
          <Text style={styles.buttonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  separator: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

