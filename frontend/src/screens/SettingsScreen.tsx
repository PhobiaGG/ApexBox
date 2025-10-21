import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../contexts/SettingsContext';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { settings, updateProfile, updateUnits, updateTheme, updateConnectivity, toggleDeveloperMode, resetSettings } = useSettings();
  const [tapCount, setTapCount] = useState(0);
  const [profileName, setProfileName] = useState(settings.profile.displayName);
  const [carModel, setCarModel] = useState(settings.profile.carModel);
  const [carYear, setCarYear] = useState(settings.profile.carYear);

  const handleVersionTap = () => {
    setTapCount(prev => prev + 1);
    if (tapCount + 1 >= 7) {
      toggleDeveloperMode();
      Alert.alert(
        settings.developerMode ? 'Developer Mode Disabled' : 'Developer Mode Enabled',
        settings.developerMode ? 'Advanced features disabled' : 'Advanced features unlocked'
      );
      setTapCount(0);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      displayName: profileName,
      carModel,
      carYear,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Profile updated successfully');
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            Alert.alert('Reset Complete', 'All settings have been reset');
          },
        },
      ]
    );
  };

  const getAccentColor = () => {
    switch (settings.theme.accentColor) {
      case 'cyan': return COLORS.cyan;
      case 'magenta': return COLORS.magenta;
      case 'lime': return COLORS.lime;
      default: return COLORS.cyan;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.label}>Car Model</Text>
              <TextInput
                style={styles.input}
                value={carModel}
                onChangeText={setCarModel}
                placeholder="e.g. BMW M4"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.label}>Car Year</Text>
              <TextInput
                style={styles.input}
                value={carYear}
                onChangeText={setCarYear}
                placeholder="e.g. 2024"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <LinearGradient colors={[COLORS.cyan, '#0088AA']} style={styles.saveGradient}>
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Units & Display Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Units & Display</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Metric System (km/h)</Text>
                <Switch
                  value={settings.units.isMetric}
                  onValueChange={async (value) => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateUnits({ isMetric: value });
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.cyan }}
                  thumbColor={COLORS.text}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Temperature (Celsius)</Text>
                <Switch
                  value={settings.units.tempCelsius}
                  onValueChange={async (value) => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateUnits({ tempCelsius: value });
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.cyan }}
                  thumbColor={COLORS.text}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Altitude (Meters)</Text>
                <Switch
                  value={settings.units.altitudeMetric}
                  onValueChange={async (value) => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateUnits({ altitudeMetric: value });
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.cyan }}
                  thumbColor={COLORS.text}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>24-Hour Time</Text>
                <Switch
                  value={settings.units.time24Hour}
                  onValueChange={async (value) => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateUnits({ time24Hour: value });
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.cyan }}
                  thumbColor={COLORS.text}
                />
              </View>
            </View>
          </View>

          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Accent Color</Text>
              <View style={styles.colorPicker}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { borderColor: COLORS.cyan, borderWidth: settings.theme.accentColor === 'cyan' ? 3 : 1 }
                  ]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateTheme({ accentColor: 'cyan' });
                  }}
                >
                  <View style={[styles.colorCircle, { backgroundColor: COLORS.cyan }]} />
                  <Text style={styles.colorLabel}>Cyan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { borderColor: COLORS.magenta, borderWidth: settings.theme.accentColor === 'magenta' ? 3 : 1 }
                  ]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateTheme({ accentColor: 'magenta' });
                  }}
                >
                  <View style={[styles.colorCircle, { backgroundColor: COLORS.magenta }]} />
                  <Text style={styles.colorLabel}>Magenta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { borderColor: COLORS.lime, borderWidth: settings.theme.accentColor === 'lime' ? 3 : 1 }
                  ]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await updateTheme({ accentColor: 'lime' });
                  }}
                >
                  <View style={[styles.colorCircle, { backgroundColor: COLORS.lime }]} />
                  <Text style={styles.colorLabel}>Lime</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Connectivity Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connectivity</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>BLE Auto-Connect</Text>
                <Switch
                  value={settings.connectivity.bleAutoConnect}
                  onValueChange={async (value) => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await updateConnectivity({ bleAutoConnect: value });
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.cyan }}
                  thumbColor={COLORS.text}
                />
              </View>

              {settings.connectivity.lastDevice && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="bluetooth" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>Last: {settings.connectivity.lastDevice}</Text>
                </View>
              )}
            </View>
          </View>

          {/* System Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.infoRow} onPress={handleVersionTap}>
                <MaterialCommunityIcons name="information" size={20} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>App Version 1.0.0</Text>
              </TouchableOpacity>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="chip" size={20} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>Firmware Compatible: v2.4+</Text>
              </View>

              {settings.developerMode && (
                <View style={[styles.infoRow, { backgroundColor: COLORS.lime + '20' }]}>
                  <MaterialCommunityIcons name="developer-board" size={20} color={COLORS.lime} />
                  <Text style={[styles.infoText, { color: COLORS.lime }]}>Developer Mode Active</Text>
                </View>
              )}
            </View>
          </View>

          {/* Storage Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.actionRow} onPress={handleResetAll}>
                <MaterialCommunityIcons name="delete" size={20} color={COLORS.danger} />
                <Text style={[styles.actionText, { color: COLORS.danger }]}>Reset All Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
  saveButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  colorOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: SPACING.xs,
  },
  colorLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});