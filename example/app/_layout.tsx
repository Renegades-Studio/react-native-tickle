import { Stack } from 'expo-router';
import { useHapticEngine } from 'react-native-ahap';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useHapticEngine();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </GestureHandlerRootView>
  );
}
