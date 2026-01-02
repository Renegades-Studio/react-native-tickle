import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  TextInput,
} from 'react-native';
import type { RecordedHaptic } from '../types/recording';

interface RecordingItemProps {
  recording: RecordedHaptic;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
}

export default function RecordingItem({
  recording,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  onPause,
  onDelete,
  onNameChange,
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

  const handlePlayPausePress = () => {
    if (isPlaying) {
      onPause(recording.id);
    } else {
      onPlay(recording.id);
    }
  };

  const handleExport = async () => {
    try {
      // Only export the essential haptic data
      const exportData = {
        events: recording.events,
        curves: recording.curves,
      };
      const jsonData = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonData,
        title: `Export ${recording.name}`,
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(recording.id)}
      activeOpacity={0.8}
      disabled={isSelected}
    >
      <View style={[styles.container, isSelected && styles.selectedContainer]}>
        <View style={styles.info}>
          <TextInput
            style={styles.name}
            editable={isSelected}
            pointerEvents={isSelected ? 'auto' : 'none'}
            defaultValue={recording.name}
            onChangeText={(text) => {
              onNameChange(recording.id, text);
            }}
            returnKeyType="done"
            placeholderTextColor="#636366"
            maxLength={50}
          />
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              {formatDuration(recording.duration)}
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.metaText}>
              {formatDate(recording.createdAt)}
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.metaText}>
              {recording.events.length} event
              {recording.events.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.playButton]}
              onPress={handlePlayPausePress}
            >
              {isPlaying ? (
                <View style={styles.pauseIcon}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <View style={styles.playIcon} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.exportButton]}
              onPress={handleExport}
            >
              <Text style={styles.buttonText}>↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => onDelete(recording.id)}
            >
              <Text style={styles.buttonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedContainer: {
    borderColor: '#007AFF',
    backgroundColor: '#0A1A2E',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    paddingEnd: 16,
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
    width: 30,
    height: 30,
    borderRadius: 30 / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#007AFF',
  },
  exportButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: '#FFFFFF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 3,
  },
  pauseBar: {
    width: 4,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});
