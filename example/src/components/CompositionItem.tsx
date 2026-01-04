import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  TextInput,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { Composition } from '../types/composer';
import { useTheme } from '../contexts/ThemeContext';
import { composerEventToHapticEvent, composerEventsToCurves } from '../types/composer';

interface CompositionItemProps {
  composition: Composition;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
}

export default function CompositionItem({
  composition,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  onPause,
  onDelete,
  onNameChange,
}: CompositionItemProps) {
  const { colors } = useTheme();

  const formatDuration = (events: Composition['events']) => {
    if (events.length === 0) return '0:00';
    const maxTime = events.reduce((max, event) => {
      const eventEnd =
        event.type === 'continuous'
          ? event.startTime + event.duration
          : event.startTime + 0.1;
      return Math.max(max, eventEnd);
    }, 0);
    const mins = Math.floor(maxTime / 60);
    const secs = Math.floor(maxTime % 60);
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
      onPause(composition.id);
    } else {
      onPlay(composition.id);
    }
  };

  const handleExport = async () => {
    try {
      const hapticEvents = composition.events.map(composerEventToHapticEvent);
      const hapticCurves = composerEventsToCurves(composition.events);
      const exportData = {
        events: hapticEvents,
        curves: hapticCurves,
      };
      const jsonData = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonData,
        title: `Export ${composition.name}`,
      });
    } catch (error) {
      console.error('Error sharing composition:', error);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(composition.id)}
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
            defaultValue={composition.name}
            onChangeText={(text) => {
              onNameChange(composition.id, text);
            }}
            returnKeyType="done"
            placeholderTextColor={colors.tertiaryText}
            maxLength={50}
          />
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDuration(composition.events)}
            </Text>
            <Text style={[styles.separator, { color: colors.secondaryText }]}>
              •
            </Text>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDate(composition.createdAt)}
            </Text>
            <Text style={[styles.separator, { color: colors.secondaryText }]}>
              •
            </Text>
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {composition.events.length} event
              {composition.events.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.blue }]}
              onPress={handlePlayPausePress}
            >
              <SymbolView
                name={isPlaying ? 'pause.fill' : 'play.fill'}
                size={16}
                tintColor="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.green }]}
              onPress={handleExport}
            >
              <SymbolView
                name="square.and.arrow.up"
                size={16}
                tintColor="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => onDelete(composition.id)}
            >
              <SymbolView name="xmark" size={16} tintColor="#FFFFFF" />
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
});

