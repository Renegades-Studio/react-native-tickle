import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  TextInput,
} from 'react-native';
import type { RecordedHaptic } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();

  const formatDuration = (millisecond: number) => {
    const mins = Math.floor(millisecond / 60000);
    const secs = Math.floor((millisecond % 60000) / 1000);
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: colors.border },
          isSelected && {
            ...styles.selectedContainer,
            borderColor: colors.borderActive,
            backgroundColor: colors.cardSelected,
          },
        ]}
      >
        <View style={styles.info}>
          <TextInput
            style={[styles.name, { color: colors.text }]}
            editable={isSelected}
            pointerEvents={isSelected ? 'auto' : 'none'}
            defaultValue={recording.name}
            onChangeText={(text) => {
              onNameChange(recording.id, text);
            }}
            returnKeyType="done"
            placeholderTextColor={colors.tertiaryText}
            maxLength={50}
          />
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDuration(recording.duration)}
            </Text>
            <Text style={[styles.separator, { color: colors.secondaryText }]}>
              •
            </Text>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDate(recording.createdAt)}
            </Text>
            <Text style={[styles.separator, { color: colors.secondaryText }]}>
              •
            </Text>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {recording.events.length} event
              {recording.events.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.blue }]}
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
              style={[styles.button, { backgroundColor: colors.green }]}
              onPress={handleExport}
            >
              <Text style={styles.buttonText}>↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  selectedContainer: {},
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  separator: {
    fontSize: 12,
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
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
