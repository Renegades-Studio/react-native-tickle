import { useState } from 'react';
import type { TextInputProps, TextProps as RNTextProps } from 'react-native';
import { TextInput } from 'react-native';
import Animated, {
  type AnimatedProps,
  type DerivedValue,
  type SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';

interface TextProps extends Omit<TextInputProps, 'value' | 'style'> {
  text: SharedValue<string> | DerivedValue<string>;
  style?: AnimatedProps<RNTextProps>['style'];
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const ReText = (props: TextProps) => {
  const { style, text, ...rest } = props;
  const [initialValue] = useState(text.get());
  const animatedProps = useAnimatedProps(() => {
    return {
      text: text.get(),
      // Here we use any because the text prop is not available in the type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      value={initialValue}
      style={style || undefined}
      {...rest}
      {...{ animatedProps }}
    />
  );
};

export default ReText;
