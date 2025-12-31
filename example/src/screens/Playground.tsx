import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHapticEngine } from 'react-native-ahap';
import TransientPalette from '../components/TransientPalette';
import ContinuousPalette from '../components/ContinuousPalette';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MARGIN = 16;
const LABEL_HEIGHT = 24;

const totalWidth = SCREEN_WIDTH - 2 * MARGIN;
const totalHeight = SCREEN_HEIGHT - 80 - 4 * LABEL_HEIGHT - 2 * MARGIN;
const PALETTE_SIZE = Math.min(totalWidth, totalHeight / 2);

export const Playground = () => {
  useHapticEngine();

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    padColor: isDark ? '#3A3A3C' : '#D1D1D6',
    flashColor: isDark ? '#48484A' : '#C7C7CC',
    touchIndicator: '#F7A98A',
  };

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
