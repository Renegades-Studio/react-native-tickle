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
import { SymbolView } from 'expo-symbols';
import type { RecordedHaptic } from '../types/recording';
import { useRecorder } from '../contexts/RecorderContext';
import { useTheme } from '../contexts/ThemeContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { recordedHapticSchema } from '../schemas/recordingSchema';
import { ZodError } from 'zod';
import { hapticEventsToRecordingEvents } from '../utils/hapticPlayback';
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

export function ImportModal() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, borderBottomColor: colors.card },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Import Recording
        </Text>
        {isPresented && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeButton, { backgroundColor: colors.card }]}
          >
            <SymbolView name="xmark" size={18} tintColor={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Title</Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.timelineGrid,
              },
            ]}
            value={title}
            autoFocus
            onChangeText={setTitle}
            placeholder="Enter recording name"
            placeholderTextColor={colors.tertiaryText}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>JSON Data</Text>
          <TextInput
            style={[
              styles.jsonInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.timelineGrid,
              },
            ]}
            value={jsonText}
            onChangeText={setJsonText}
            placeholder="Paste recording JSON here"
            placeholderTextColor={colors.tertiaryText}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.accent }]}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.importButton,
            { backgroundColor: colors.blue },
            (!title.trim() || !jsonText.trim()) && {
              ...styles.importButtonDisabled,
              backgroundColor: colors.card,
            },
          ]}
          onPress={handleImport}
          disabled={!title.trim() || !jsonText.trim()}
        >
          <Text style={[styles.importButtonText, { color: colors.text }]}>
            Import
          </Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.secondaryText }]}>
          Paste the JSON data exported from a recording. The recording will be
          added to your list.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 8,
  },
  titleInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  jsonInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    minHeight: 200,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    height: 200,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  importButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonDisabled: {},
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

