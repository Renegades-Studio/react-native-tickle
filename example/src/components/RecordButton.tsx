import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useState, useEffect } from 'react';

interface RecordButtonProps {
  isRecording: SharedValue<boolean>;
  onPress: () => void;
}

export default function RecordButton({
  isRecording,
  onPress,
}: RecordButtonProps) {
  // Track recording state in React state for text rendering
  const [recording, setRecording] = useState(false);

  // Sync shared value to state
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRecording.get() !== recording) {
        setRecording(isRecording.get());
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isRecording, recording]);

  const handlePress = () => {
    onPress();
    setRecording((prev) => !prev);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    backgroundColor: isRecording.get() ? '#8E8E93' : '#FF3B30',
  }));

  const iconStyle = useAnimatedStyle(() => ({
    borderRadius: isRecording.get() ? 2 : 10,
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.button, buttonStyle]}>
          <Animated.View style={[styles.icon, iconStyle]} />
          <Text style={styles.text}>{recording ? 'STOP' : 'RECORD'}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
