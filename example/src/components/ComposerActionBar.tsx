import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ComposerActionBarProps {
  isPlaying: SharedValue<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onPlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onMore: () => void;
}

export default function ComposerActionBar({
  isPlaying,
  canUndo,
  canRedo,
  hasSelection,
  onPlay,
  onUndo,
  onRedo,
  onAdd,
  onDelete,
  onMore,
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
        <Animated.View style={[styles.buttonContainer, playButtonStyle]}>
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={onPlay}
            activeOpacity={0.7}
          >
            <PlayPauseIcon isPlaying={isPlaying} />
          </TouchableOpacity>
        </Animated.View>

        {/* Undo */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.blue },
            !canUndo && { opacity: 0.4 },
          ]}
          onPress={onUndo}
          disabled={!canUndo}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-undo" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.blue }]}
          onPress={onAdd}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
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
          <Ionicons name="trash" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Redo */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.blue },
            !canRedo && { opacity: 0.4 },
          ]}
          onPress={onRedo}
          disabled={!canRedo}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-redo" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* More options */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF8C32' }]}
          onPress={onMore}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
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
        <Ionicons name="play" size={24} color="#FFFFFF" />
      </Animated.View>
      <Animated.View style={pauseStyle}>
        <Ionicons name="pause" size={24} color="#FFFFFF" />
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

