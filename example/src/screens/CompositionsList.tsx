import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import CompositionItem from '../components/CompositionItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useState } from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../contexts/ThemeContext';
import { useCompositionsStore } from '../stores/compositionsStore';
import { useComposer } from '../contexts/ComposerContext';

export function CompositionsList() {
  const { colors } = useTheme();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const compositions = useCompositionsStore((state) => state.compositions);
  const deleteComposition = useCompositionsStore(
    (state) => state.deleteComposition
  );
  const renameComposition = useCompositionsStore(
    (state) => state.renameComposition
  );
  const {
    currentCompositionId,
    loadComposition,
    createAndLoadComposition,
    startPlayback,
    stopPlayback,
    isPlaying,
  } = useComposer();

  useAnimatedReaction(
    () => isPlaying.get(),
    (playing) => {
      if (playing && currentCompositionId) {
        scheduleOnRN(setPlayingId, currentCompositionId);
      } else {
        scheduleOnRN(setPlayingId, null);
      }
    }
  );

  const handleSelect = (id: string) => {
    if (currentCompositionId === id) {
      loadComposition('');
    } else {
      loadComposition(id);
    }
  };

  const handlePlay = (id: string) => {
    if (currentCompositionId !== id) {
      loadComposition(id);
    }
    startPlayback();
  };

  const handlePause = () => {
    stopPlayback();
  };

  const handleNew = () => {
    createAndLoadComposition();
    router.back();
  };

  const handleImport = () => {
    router.push('/composer-import-modal');
  };

  const handleClose = () => {
    router.back();
  };

  if (compositions.length === 0) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.background, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Compositions
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: colors.card }]}
          >
            <SymbolView name="xmark" size={18} tintColor={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            No compositions yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.tertiaryText }]}>
            Create a new composition or import an existing one
          </Text>
          <View style={styles.emptyButtonsContainer}>
            <TouchableOpacity
              onPress={handleNew}
              style={[
                styles.emptyButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.timelineGrid,
                },
              ]}
            >
              <SymbolView
                name="plus"
                size={32}
                tintColor={colors.blue}
                style={styles.emptyButtonIcon}
              />
              <Text style={[styles.emptyButtonText, { color: colors.text }]}>
                New
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImport}
              style={[
                styles.emptyButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.timelineGrid,
                },
              ]}
            >
              <SymbolView
                name="folder"
                size={32}
                tintColor={colors.blue}
                style={styles.emptyButtonIcon}
              />
              <Text style={[styles.emptyButtonText, { color: colors.text }]}>
                Import
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <KeyboardStickyView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Compositions
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleNew}
              style={[styles.addButton, { backgroundColor: colors.blue }]}
            >
              <SymbolView name="plus" size={24} tintColor="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImport}
              style={[styles.addButton, { backgroundColor: colors.green }]}
            >
              <SymbolView name="folder" size={24} tintColor="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <SymbolView name="xmark" size={18} tintColor={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={compositions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => (
            <CompositionItem
              composition={item}
              isSelected={currentCompositionId === item.id}
              isPlaying={playingId === item.id}
              onSelect={handleSelect}
              onPlay={handlePlay}
              onPause={handlePause}
              onDelete={deleteComposition}
              onNameChange={renameComposition}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButtonsContainer: {
    gap: 16,
    width: '100%',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyButtonIcon: {
    marginBottom: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
