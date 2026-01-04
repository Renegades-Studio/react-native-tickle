import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface EventNavigationProps {
  hasSelection: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function EventNavigation({
  hasSelection,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: EventNavigationProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Previous button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          {
            backgroundColor: canGoPrevious ? colors.blue : colors.card,
          },
        ]}
        onPress={onPrevious}
        disabled={!canGoPrevious}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.arrowText,
            { color: canGoPrevious ? '#FFFFFF' : colors.tertiaryText },
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
          {
            backgroundColor: canGoNext ? colors.blue : colors.card,
          },
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
