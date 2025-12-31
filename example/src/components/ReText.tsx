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
