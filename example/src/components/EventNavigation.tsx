import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface EventNavigationProps {
  selectedEventIndex: number | null;
  totalEvents: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function EventNavigation({
  selectedEventIndex,
  totalEvents,
  onPrevious,
  onNext,
}: EventNavigationProps) {
  const { colors } = useTheme();

  const canGoPrevious = selectedEventIndex !== null && selectedEventIndex > 0;
  const canGoNext =
    selectedEventIndex !== null && selectedEventIndex < totalEvents - 1;
  const hasSelection = selectedEventIndex !== null;

  return (
    <View style={styles.container}>
      {/* Previous button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: colors.card },
          !canGoPrevious && styles.disabledButton,
        ]}
        onPress={onPrevious}
        disabled={!canGoPrevious}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.arrowText,
            { color: canGoPrevious ? colors.blue : colors.tertiaryText },
          ]}
        >
          ←
        </Text>
      </TouchableOpacity>

      {/* Selection info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: colors.text }]}>
          {hasSelection
            ? `Selected event: ${selectedEventIndex + 1}`
            : 'No selection'}
        </Text>
      </View>

      {/* Event count */}
      <Text style={[styles.countText, { color: colors.secondaryText }]}>
        {totalEvents} event{totalEvents !== 1 ? 's' : ''} total
      </Text>

      {/* Next button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: colors.blue },
          !canGoNext && { backgroundColor: colors.card },
        ]}
        onPress={onNext}
        disabled={!canGoNext}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.arrowText,
            { color: canGoNext ? '#FFFFFF' : colors.tertiaryText },
          ]}
        >
          →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
    marginRight: 12,
  },
});

