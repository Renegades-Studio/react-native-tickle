import { Stack } from 'expo-router';
import { HapticProvider } from 'react-native-ahaps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RecorderProvider } from '../src/contexts/RecorderContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  return (
    <HapticProvider>
      <KeyboardProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </KeyboardProvider>
    </HapticProvider>
  );
}
