import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RecordedHaptic } from '../src/types/recording';
import { useRecorder } from '../src/contexts/RecorderContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { recordedHapticSchema } from '../src/schemas/recordingSchema';
import { ZodError } from 'zod';
import { hapticEventsToRecordingEvents } from '../src/utils/hapticPlayback';
import type { HapticEvent } from 'react-native-ahaps';

const getDuration = (events: HapticEvent[]) => {
  return events.reduce((maxTime, event) => {
    const eventEnd =
      event.type === 'continuous'
        ? event.relativeTime + event.duration
        : event.relativeTime;
    return Math.max(maxTime, eventEnd);
  }, 0);
};

export default function ImportModal() {
  const insets = useSafeAreaInsets();
  const { importRecording } = useRecorder();
  const [title, setTitle] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');

    // Validate title
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    // Validate and parse JSON
    try {
      const parsed = JSON.parse(jsonText);

      // Validate using Zod schema
      const validationResult = recordedHapticSchema.safeParse(parsed);

      if (!validationResult.success) {
        // Format Zod errors for user-friendly display
        const zodError = validationResult.error;
        const firstError = zodError.issues[0];
        const errorPath = firstError?.path.join('.') || 'unknown field';
        const errorMessage = firstError?.message || 'Invalid format';
        setError(`Validation error at ${errorPath}: ${errorMessage}`);
        return;
      }

      const { events, curves } = validationResult.data;

      const duration = getDuration(events);

      const recordingEvents = hapticEventsToRecordingEvents(events, curves);

      const recording: RecordedHaptic = {
        id: Date.now().toString(),
        name: title,
        createdAt: Date.now(),
        duration,
        events,
        curves,
        recordingEvents,
      };

      // Import the recording
      importRecording(recording);

      // Navigate back
      router.back();
    } catch (err) {
      if (err instanceof ZodError) {
        setError('Invalid recording format. Please check your JSON.');
      } else if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your input.');
      } else {
        setError('An error occurred while importing the recording.');
      }
      console.error('Import error:', err);
    }
  };

  const isPresented = router.canGoBack();

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Import Recording</Text>
        {isPresented && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter recording name"
            placeholderTextColor="#636366"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>JSON Data</Text>
          <TextInput
            style={styles.jsonInput}
            value={jsonText}
            onChangeText={setJsonText}
            placeholder="Paste recording JSON here"
            placeholderTextColor="#636366"
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.importButton,
            (!title.trim() || !jsonText.trim()) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={!title.trim() || !jsonText.trim()}
        >
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Paste the JSON data exported from a recording. The recording will be
          added to your list.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  jsonInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 200,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    height: 200,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonDisabled: {
    backgroundColor: '#1C1C1E',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
