import { Stack } from 'expo-router';
import { useHapticEngine } from 'react-native-ahap';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RecorderProvider } from '../src/contexts/RecorderContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  useHapticEngine();

  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RecorderProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="playground" />
            <Stack.Screen name="recorder" />
            <Stack.Screen
              name="import-modal"
              options={{
                presentation: 'formSheet',
              }}
            />
          </Stack>
        </RecorderProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
}
