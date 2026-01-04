import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface EventNavigationProps {
  selectedEventId: string | null;
  totalEvents: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function EventNavigation({
  selectedEventId,
  totalEvents,
  onPrevious,
  onNext,
}: EventNavigationProps) {
  const { colors } = useTheme();

  const hasSelection = selectedEventId !== null;
  // Navigation buttons are enabled when there's a selection and multiple events
  const canNavigate = hasSelection && totalEvents > 1;

  return (
    <View style={styles.container}>
      {/* Previous button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: colors.card },
          !canNavigate && styles.disabledButton,
        ]}
        onPress={onPrevious}
        disabled={!canNavigate}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.arrowText,
            { color: canNavigate ? colors.blue : colors.tertiaryText },
          ]}
        >
          ←
        </Text>
      </TouchableOpacity>

      {/* Selection info - centered */}
      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: colors.text }]}>
          {hasSelection ? 'Event selected' : 'No selection'}
        </Text>
      </View>

      {/* Next button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: colors.blue },
          !canNavigate && { backgroundColor: colors.card },
        ]}
        onPress={onNext}
        disabled={!canNavigate}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.arrowText,
            { color: canNavigate ? '#FFFFFF' : colors.tertiaryText },
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
});

