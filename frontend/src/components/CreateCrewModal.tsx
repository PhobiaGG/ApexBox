import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface CreateCrewModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  accentColor: string;
  colors: any;
}

export default function CreateCrewModal({
  visible,
  onClose,
  onCreate,
  accentColor,
  colors,
}: CreateCrewModalProps) {
  const [crewName, setCrewName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!crewName.trim()) {
      Alert.alert('Error', 'Please enter a crew name');
      return;
    }

    if (crewName.length < 3) {
      Alert.alert('Error', 'Crew name must be at least 3 characters');
      return;
    }

    if (crewName.length > 30) {
      Alert.alert('Error', 'Crew name must be less than 30 characters');
      return;
    }

    try {
      setIsCreating(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onCreate(crewName.trim(), description.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setCrewName('');
      setDescription('');
      onClose();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create crew');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCrewName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <MaterialCommunityIcons name="account-group" size={40} color={accentColor} />
              <Text style={[styles.title, { color: colors.text }]}>Create Crew</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Start your own racing crew
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <MaterialCommunityIcons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Crew Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Crew Name *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter crew name..."
                    placeholderTextColor={colors.textSecondary}
                    value={crewName}
                    onChangeText={setCrewName}
                    maxLength={30}
                    autoCapitalize="words"
                    editable={!isCreating}
                  />
                  <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                    {crewName.length}/30
                  </Text>
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Choose a unique name that represents your crew
                </Text>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                <View
                  style={[
                    styles.inputContainer,
                    styles.textAreaContainer,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea, { color: colors.text }]}
                    placeholder="Tell others about your crew..."
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    maxLength={150}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isCreating}
                  />
                </View>
                <View style={styles.hintRow}>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>Optional</Text>
                  <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                    {description.length}/150
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: accentColor }]}>
                <MaterialCommunityIcons name="information" size={20} color={accentColor} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>About Crews</Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • Compete with your crew on leaderboards
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • Share sessions and achievements
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • Track collective crew stats
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • As creator, you'll be the crew admin
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleCancel}
                disabled={isCreating}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreate}
                disabled={isCreating || !crewName.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!crewName.trim() ? [colors.border, colors.border] : [accentColor, colors.background]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check" size={20} color={colors.text} />
                      <Text style={[styles.buttonText, { color: colors.text }]}>Create Crew</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SPACING.sm,
  },
  form: {
    gap: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    padding: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONT_SIZE.xs,
    marginLeft: SPACING.sm,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {},
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
