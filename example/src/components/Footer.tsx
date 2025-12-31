import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import ReText from './ReText';

interface FooterProps {
  text: SharedValue<string>;
  color: string;
}

export default function Footer({ text, color }: FooterProps) {
  return <ReText text={text} style={[styles.valueLabel, { color }]} />;
}

const styles = StyleSheet.create({
  valueLabel: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

