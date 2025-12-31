import { Text, StyleSheet } from 'react-native';

interface HeaderProps {
  title: string;
  color: string;
}

export default function Header({ title, color }: HeaderProps) {
  return <Text style={[styles.titleLabel, { color }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  titleLabel: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
});

