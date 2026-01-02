import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export function Menu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Haptix Studio</Text>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: colors.card }]}
        onPress={() => router.push('/playground')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>
          Haptic Playground
        </Text>
        <Text style={[styles.menuDescription, { color: colors.secondaryText }]}>
          Explore continuous and transient haptics
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: colors.card }]}
        onPress={() => router.push('/recorder')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>
          Haptic Recorder
        </Text>
        <Text style={[styles.menuDescription, { color: colors.secondaryText }]}>
          Record and playback haptic patterns
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 48,
    textAlign: 'center',
  },
  menuItem: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  menuText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 16,
  },
});
