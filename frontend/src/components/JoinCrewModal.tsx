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

interface JoinCrewModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (crewCode: string) => Promise<void>;
  accentColor: string;
  colors: any;
}

export default function JoinCrewModal({
  visible,
  onClose,
  onJoin,
  accentColor,
  colors,
}: JoinCrewModalProps) {
  const [crewCode, setCrewCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!crewCode.trim()) {
      Alert.alert('Error', 'Please enter a crew code');
      return;
    }

    try {
      setIsJoining(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onJoin(crewCode.trim().toUpperCase());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setCrewCode('');
      onClose();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to join crew');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCrewCode('');
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
            <View style={styles.header}>
              <MaterialCommunityIcons name="account-multiple-plus" size={40} color={accentColor} />
              <Text style={[styles.title, { color: colors.text }]}>Join Crew</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter a crew code to join
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <MaterialCommunityIcons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Crew Code</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: accentColor }]}>
                  <MaterialCommunityIcons
                    name="key-variant"
                    size={24}
                    color={accentColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="XXXXX-XXXXX"
                    placeholderTextColor={colors.textSecondary}
                    value={crewCode}
                    onChangeText={(text) => setCrewCode(text.toUpperCase())}
                    maxLength={11}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isJoining}
                  />
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Ask your crew admin for the code
                </Text>
              </View>

              <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="information" size={20} color={accentColor} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • Crew codes are provided by crew admins
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • You can only be in one crew at a time
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    • Your stats will be shared with crew members
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleCancel}
                disabled={isJoining}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.joinButton]}
                onPress={handleJoin}
                disabled={isJoining || !crewCode.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!crewCode.trim() ? [colors.border, colors.border] : [accentColor, colors.background]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check" size={20} color={colors.text} />
                      <Text style={[styles.buttonText, { color: colors.text }]}>Join Crew</Text>
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
    borderWidth: 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    letterSpacing: 2,
    padding: 0,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
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
  joinButton: {},
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
