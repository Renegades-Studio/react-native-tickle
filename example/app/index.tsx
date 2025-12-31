import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Menu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.title}>Haptic Toolkit</Text>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push('/playground')}
      >
        <Text style={styles.menuText}>Haptic Playground</Text>
        <Text style={styles.menuDescription}>
          Explore continuous and transient haptics
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push('/recorder')}
      >
        <Text style={styles.menuText}>Haptic Recorder</Text>
        <Text style={styles.menuDescription}>
          Record and playback haptic patterns
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 48,
    textAlign: 'center',
  },
  menuItem: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  menuText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
