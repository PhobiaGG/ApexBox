import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface AddCarModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (car: CarData) => Promise<void>;
  accentColor: string;
  editCar?: CarData | null;
}

export interface CarData {
  nickname: string;
  make: string;
  model: string;
  year: string;
  color: string;
  upgrades?: string;
}

export default function AddCarModal({ visible, onClose, onSave, accentColor, editCar }: AddCarModalProps) {
  const [nickname, setNickname] = useState(editCar?.nickname || '');
  const [make, setMake] = useState(editCar?.make || '');
  const [model, setModel] = useState(editCar?.model || '');
  const [year, setYear] = useState(editCar?.year || '');
  const [color, setColor] = useState(editCar?.color || '');
  const [loading, setLoading] = useState(false);

  const validateInputs = (): boolean => {
    if (!nickname.trim()) {
      Alert.alert('Error', 'Please enter a nickname for your car');
      return false;
    }
    if (!make.trim()) {
      Alert.alert('Error', 'Please enter the make (e.g., Ford)');
      return false;
    }
    if (!model.trim()) {
      Alert.alert('Error', 'Please enter the model (e.g., Mustang GT)');
      return false;
    }
    if (!year.trim()) {
      Alert.alert('Error', 'Please enter the year');
      return false;
    }
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return false;
    }
    if (!color.trim()) {
      Alert.alert('Error', 'Please enter the color');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await onSave({
        nickname: nickname.trim(),
        make: make.trim(),
        model: model.trim(),
        year: year.trim(),
        color: color.trim(),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setNickname('');
      setMake('');
      setModel('');
      setYear('');
      setColor('');
      
      onClose();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save car');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNickname('');
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <BlurView intensity={80} style={styles.blurContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[COLORS.card, COLORS.background]}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <MaterialCommunityIcons name="car-sports" size={40} color={accentColor} />
                <Text style={styles.title}>{editCar ? 'Edit Car' : 'Add New Car'}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                  <MaterialCommunityIcons name="close" size={28} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {/* Nickname */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nickname</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="text" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., My Mustang"
                      placeholderTextColor={COLORS.textSecondary}
                      value={nickname}
                      onChangeText={setNickname}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Make */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Make</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="factory" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Ford"
                      placeholderTextColor={COLORS.textSecondary}
                      value={make}
                      onChangeText={setMake}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Model */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Model</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="car" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Mustang GT"
                      placeholderTextColor={COLORS.textSecondary}
                      value={model}
                      onChangeText={setModel}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Year */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 2020"
                      placeholderTextColor={COLORS.textSecondary}
                      value={year}
                      onChangeText={setYear}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>

                {/* Color */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="palette" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Red"
                      placeholderTextColor={COLORS.textSecondary}
                      value={color}
                      onChangeText={setColor}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[accentColor, COLORS.background]}
                    style={styles.saveGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="check" size={24} color={COLORS.text} />
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Saving...' : editCar ? 'Update' : 'Add Car'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  scrollView: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});
