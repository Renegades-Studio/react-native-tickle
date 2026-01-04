import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '../contexts/ThemeContext';

interface ComposerActionBarProps {
  isPlaying: SharedValue<boolean>;
  canPlay: boolean;
  hasSelection: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onList: () => void;
  onLibrary: () => void;
}

export default function ComposerActionBar({
  isPlaying,
  hasSelection,
  canPlay,
  onPlay,
  onAdd,
  onDelete,
  onList,
  onLibrary,
}: ComposerActionBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const playButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isPlaying.get() ? colors.accent : colors.blue,
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: 'transparent',
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: colors.background }]}>
        {/* Play/Pause */}
        <Animated.View
          style={[
            styles.buttonContainer,
            !canPlay && { opacity: 0.4 },
            playButtonStyle,
          ]}
        >
          <TouchableOpacity
            style={[styles.buttonTouchable]}
            onPress={onPlay}
            activeOpacity={0.7}
            disabled={!canPlay}
          >
            <PlayPauseIcon isPlaying={isPlaying} />
          </TouchableOpacity>
        </Animated.View>

        {/* Add */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.blue }]}
          onPress={onAdd}
          activeOpacity={0.7}
        >
          <SymbolView name="plus" size={28} tintColor="#FFFFFF" />
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.accent },
            !hasSelection && { opacity: 0.4 },
          ]}
          onPress={onDelete}
          disabled={!hasSelection}
          activeOpacity={0.7}
        >
          <SymbolView name="trash" size={22} tintColor="#FFFFFF" />
        </TouchableOpacity>

        {/* Library */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.purple }]}
          onPress={onLibrary}
          activeOpacity={0.7}
        >
          <SymbolView name="books.vertical" size={22} tintColor="#FFFFFF" />
        </TouchableOpacity>

        {/* List */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF8C32' }]}
          onPress={onList}
          activeOpacity={0.7}
        >
          <SymbolView name="list.bullet" size={22} tintColor="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlayPauseIcon({ isPlaying }: { isPlaying: SharedValue<boolean> }) {
  const playStyle = useAnimatedStyle(() => ({
    opacity: isPlaying.get() ? 0 : 1,
    position: 'absolute' as const,
  }));

  const pauseStyle = useAnimatedStyle(() => ({
    opacity: isPlaying.get() ? 1 : 0,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.playPauseContainer}>
      <Animated.View style={playStyle}>
        <SymbolView name="play.fill" size={24} tintColor="#FFFFFF" />
      </Animated.View>
      <Animated.View style={pauseStyle}>
        <SymbolView name="pause.fill" size={24} tintColor="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const BUTTON_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
