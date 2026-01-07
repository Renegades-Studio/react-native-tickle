import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import {
  triggerImpact,
  triggerNotification,
  triggerSelection,
  type HapticImpactStyle,
  type HapticNotificationType,
} from 'react-native-ahaps';

const IMPACT_STYLES: HapticImpactStyle[] = [
  'light',
  'medium',
  'heavy',
  'soft',
  'rigid',
];

const NOTIFICATION_TYPES: HapticNotificationType[] = [
  'success',
  'warning',
  'error',
];

export const SystemHaptics = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [selectedImpactStyle, setSelectedImpactStyle] =
    useState<HapticImpactStyle>('medium');
  const [selectedNotificationType, setSelectedNotificationType] =
    useState<HapticNotificationType>('success');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>System Haptics</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Test predefined OS-level haptic feedback
      </Text>

      {/* Impact Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Impact Feedback
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
          Simulates a physical collision
        </Text>

        <View style={styles.pickerContainer}>
          {IMPACT_STYLES.map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.pickerItem,
                {
                  backgroundColor:
                    selectedImpactStyle === style
                      ? colors.blue
                      : colors.card,
                },
              ]}
              onPress={() => setSelectedImpactStyle(style)}
            >
              <Text
                style={[
                  styles.pickerText,
                  {
                    color:
                      selectedImpactStyle === style ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.triggerButton, { backgroundColor: colors.blue }]}
          onPress={() => triggerImpact(selectedImpactStyle)}
        >
          <Text style={styles.triggerButtonText}>Trigger Impact</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notification Feedback
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
          For alerts and status updates
        </Text>

        <View style={styles.pickerContainer}>
          {NOTIFICATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.pickerItem,
                styles.notificationPickerItem,
                {
                  backgroundColor:
                    selectedNotificationType === type
                      ? type === 'success'
                        ? colors.green
                        : type === 'warning'
                          ? '#FF9500'
                          : colors.accent
                      : colors.card,
                },
              ]}
              onPress={() => setSelectedNotificationType(type)}
            >
              <Text
                style={[
                  styles.pickerText,
                  {
                    color:
                      selectedNotificationType === type
                        ? '#FFFFFF'
                        : colors.text,
                  },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.triggerButton,
            {
              backgroundColor:
                selectedNotificationType === 'success'
                  ? colors.green
                  : selectedNotificationType === 'warning'
                    ? '#FF9500'
                    : colors.accent,
            },
          ]}
          onPress={() => triggerNotification(selectedNotificationType)}
        >
          <Text style={styles.triggerButtonText}>Trigger Notification</Text>
        </TouchableOpacity>
      </View>

      {/* Selection Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Selection Feedback
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
          For picker wheels and toggles
        </Text>

        <TouchableOpacity
          style={[styles.triggerButton, { backgroundColor: colors.purple }]}
          onPress={() => triggerSelection()}
        >
          <Text style={styles.triggerButtonText}>Trigger Selection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  notificationPickerItem: {
    flex: 1,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  triggerButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  triggerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

