import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { startHaptic, useHapticEngine } from 'react-native-ahap';

export default function App() {
  useHapticEngine();

  const handlePress = () => {
    // Example: Create a simple transient haptic event
    startHaptic(
      [
        {
          type: 'transient',
          relativeTime: 0,
          parameters: [
            { type: 'intensity', value: 1.0 },
            { type: 'sharpness', value: 0.5 },
          ],
        },
      ],
      []
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Trigger Haptic</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
