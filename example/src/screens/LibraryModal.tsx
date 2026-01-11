import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '../contexts/ThemeContext';
import { popularCompositions } from '../../assets/haptic-compositions';
import { useComposer } from '../contexts/ComposerContext';
import { useRecorder } from '../contexts/RecorderContext';
import type { ComposerEvent } from '../types/composer';
import type { RecordedHaptic } from '../types/recording';
import { hapticEventsToRecordingEvents } from '../utils/hapticPlayback';
import type { HapticEvent } from 'react-native-tickle';
import { recordedHapticSchema } from '../schemas/recordingSchema';

const getDuration = (events: HapticEvent[]) => {
  return events.reduce((maxTime, event) => {
    const eventEnd =
      event.type === 'continuous'
        ? event.relativeTime + event.duration
        : event.relativeTime;
    return Math.max(maxTime, eventEnd);
  }, 0);
};

export function LibraryModal() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ context?: string }>();
  const context = params.context as 'composer' | 'recorder' | undefined;

  // Composer hooks
  const { importAndLoadComposition } = useComposer();

  // Recorder hooks
  const { importAndSelectRecording } = useRecorder();

  const handleSelectComposition = (compositionId: string) => {
    const composition = popularCompositions.compositions.find(
      (c) => c.id === compositionId
    );
    if (!composition) return;

    if (context === 'composer') {
      // Reuse exact logic from ComposerImportModal (lines 55-88)
      const events = composition.events;
      const composerEvents: ComposerEvent[] = [];

      for (const event of events) {
        const intensity =
          event.parameters?.find((p) => p.type === 'intensity')?.value ?? 0.5;
        const sharpness =
          event.parameters?.find((p) => p.type === 'sharpness')?.value ?? 0.5;
        const id =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);

        if (event.type === 'transient') {
          composerEvents.push({
            id,
            type: 'transient',
            startTime: event.relativeTime / 1000,
            intensity,
            sharpness,
          });
        } else {
          composerEvents.push({
            id,
            type: 'continuous',
            startTime: event.relativeTime / 1000,
            duration: (event.duration ?? 0) / 1000,
            intensity,
            sharpness,
            fadeInIntensity: 0,
            fadeInDuration: 0,
            fadeOutIntensity: 0,
            fadeOutDuration: 0,
          });
        }
      }

      importAndLoadComposition(composition.name, composerEvents);
      router.back();
    } else if (context === 'recorder') {
      // Reuse exact logic from ImportModal - use Zod to parse and get properly typed data
      const validationResult = recordedHapticSchema.safeParse({
        events: composition.events,
        curves: composition.curves,
      });

      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error);
        return;
      }

      const { events, curves } = validationResult.data;
      const duration = getDuration(events);
      const recordingEvents = hapticEventsToRecordingEvents(events, curves);

      const recording: RecordedHaptic = {
        id: Date.now().toString(),
        name: composition.name,
        createdAt: Date.now(),
        duration,
        events,
        curves,
        recordingEvents,
      };

      importAndSelectRecording(recording);
      router.back();
    }
  };

  const isPresented = router.canGoBack();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <View
        style={[
          styles.header,
          { paddingBottom: 30, borderBottomColor: colors.card },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Pick from Library
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

      <FlatList
        data={popularCompositions.compositions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.compositionItem,
              {
                backgroundColor: colors.card,
                borderColor: colors.timelineGrid,
              },
            ]}
            onPress={() => handleSelectComposition(item.id)}
          >
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.compositionDescription,
                  { color: colors.secondaryText },
                ]}
              >
                {item.description}
              </Text>
              <Text
                style={[
                  styles.compositionDuration,
                  { color: colors.tertiaryText },
                ]}
              >
                {(item.duration / 1000).toFixed(1)}s · {item.events.length}{' '}
                events
              </Text>
            </View>
            <SymbolView
              name="chevron.right"
              size={16}
              tintColor={colors.tertiaryText}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  compositionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  compositionInfo: {
    flex: 1,
    gap: 4,
  },
  compositionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  compositionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  compositionDuration: {
    fontSize: 12,
    marginTop: 4,
  },
});
