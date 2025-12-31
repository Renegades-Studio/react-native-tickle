import { useMemo } from 'react';
import type { TextInputProps, TextProps as RNTextProps } from 'react-native';
import { StyleSheet, TextInput } from 'react-native';
import Animated, {
  type AnimatedProps,
  type SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';

const styles = StyleSheet.create({
  baseStyle: {
    // Color will be overridden by style prop
  },
});

interface TextProps extends Omit<TextInputProps, 'value' | 'style'> {
  text: SharedValue<string>;
  style?: AnimatedProps<RNTextProps>['style'];
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const ReText = (props: TextProps) => {
  const { style, text, ...rest } = props;
  const initialValue = useMemo(() => text.value, [text]);
  const animatedProps = useAnimatedProps(() => {
    return {
      text: text.value,
      // Here we use any because the text prop is not available in the type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      value={initialValue}
      style={[styles.baseStyle, style || undefined]}
      {...rest}
      {...{ animatedProps }}
    />
  );
};

export default ReText;
