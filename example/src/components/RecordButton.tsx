import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import ReText from './ReText';
import { useTheme } from '../contexts/ThemeContext';

interface RecordButtonProps {
  isRecording: SharedValue<boolean>;
  onPress: () => void;
}

export default function RecordButton({
  isRecording,
  onPress,
}: RecordButtonProps) {
  const { colors } = useTheme();
  const pressed = useSharedValue(false);

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.set(true);
    })
    .onFinalize(() => {
      pressed.set(false);
    })
    .onEnd(() => {
      onPress();
    });

  const buttonStyle = useAnimatedStyle(() => ({
    backgroundColor: isRecording.get() ? colors.secondaryText : colors.accent,
    opacity: pressed.get() ? 0.8 : 1,
    transform: [
      { scale: withTiming(pressed.get() ? 0.98 : 1, { duration: 100 }) },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    borderRadius: isRecording.get() ? 2 : 10,
    backgroundColor: '#FFFFFF',
  }));

  const buttonText = useDerivedValue<string>(() =>
    isRecording.get() ? 'STOP' : 'RECORD'
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={tap}>
        <Animated.View style={[styles.button, buttonStyle]}>
          <Animated.View style={[styles.icon, iconStyle]} />
          <ReText text={buttonText} style={styles.text} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    borderRadius: 12,
  },
  icon: {
    width: 20,
    height: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
