import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticsEnabled } from '@renegades/react-native-tickle';

export function Menu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [hapticsEnabled, setHapticsEnabled] = useHapticsEnabled();

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

      <View style={{ gap: 16 }}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card }]}
          onPress={() => router.push('/playground')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Playground
          </Text>
          <Text
            style={[styles.menuDescription, { color: colors.secondaryText }]}
          >
            Explore continuous and transient haptics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card }]}
          onPress={() => router.push('/composer')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Timeline Editor
          </Text>
          <Text
            style={[styles.menuDescription, { color: colors.secondaryText }]}
          >
            Build precise haptic patterns with detailed controls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card }]}
          onPress={() => router.push('/recorder')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Gesture Studio
          </Text>
          <Text
            style={[styles.menuDescription, { color: colors.secondaryText }]}
          >
            Record haptics in real-time using touch gestures
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card }]}
          onPress={() => router.push('/system-haptics')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            System Haptics
          </Text>
          <Text
            style={[styles.menuDescription, { color: colors.secondaryText }]}
          >
            Test predefined OS-level haptic feedback
          </Text>
        </TouchableOpacity>

        <View style={[styles.toggleItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.toggleText, { color: colors.text }]}>
            Haptics {hapticsEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Switch
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
            trackColor={{ false: colors.secondaryText, true: colors.accent }}
          />
        </View>
      </View>
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
  },
  menuText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
