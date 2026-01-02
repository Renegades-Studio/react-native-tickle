import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransientPalette from '../components/TransientPalette';
import ContinuousPalette from '../components/ContinuousPalette';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MARGIN = 16;
const LABEL_HEIGHT = 24;

const totalWidth = SCREEN_WIDTH - 2 * MARGIN;
const totalHeight = SCREEN_HEIGHT - 80 - 4 * LABEL_HEIGHT - 2 * MARGIN;
const PALETTE_SIZE = Math.min(totalWidth, totalHeight / 2);

export const Playground = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          gap: MARGIN,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ContinuousPalette size={PALETTE_SIZE} colors={colors} />
      <TransientPalette size={PALETTE_SIZE} colors={colors} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: MARGIN,
  },
});
