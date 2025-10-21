import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = 'apexbox_onboarding_completed';

interface OnboardingStep {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: 'car-speed-limiter',
    title: 'Welcome to ApexBox',
    description: 'Your ESP32-powered performance tracking companion. Monitor speed, G-forces, temperature, and altitude in real-time.',
    color: COLORS.cyan,
  },
  {
    icon: 'bluetooth-connect',
    title: 'Connect Your Device',
    description: 'Tap the Bluetooth icon on the Dashboard to scan and connect to your ApexBox hardware. Live telemetry will stream at 20Hz.',
    color: COLORS.magenta,
  },
  {
    icon: 'chart-line',
    title: 'Track Your Sessions',
    description: 'Every drive is logged as a session with detailed charts and analytics. View peak speed, max G-force, and temperature trends.',
    color: COLORS.lime,
  },
  {
    icon: 'account-group',
    title: 'Join the Community',
    description: 'Compare your performance with other drivers in Groups. Climb the leaderboard with your best lap times and top speeds.',
    color: COLORS.cyan,
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // Delay to let app settle
        setTimeout(() => setVisible(true), 500);
      }
    } catch (error) {
      console.error('[Onboarding] Error checking status:', error);
    }
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVisible(false);
    } catch (error) {
      console.error('[Onboarding] Error saving completion:', error);
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[COLORS.card, COLORS.background]}
            style={styles.modalContent}
          >
            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: index === currentStep ? step.color : COLORS.border,
                      width: index === currentStep ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Icon */}
            <View style={[styles.iconContainer, { borderColor: step.color }]}>
              <MaterialCommunityIcons name={step.icon} size={80} color={step.color} />
            </View>

            {/* Content */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {/* Action Button */}
            <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
              <LinearGradient
                colors={[step.color, COLORS.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <Text style={styles.actionText}>
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                </Text>
                <MaterialCommunityIcons
                  name={currentStep === steps.length - 1 ? 'check' : 'arrow-right'}
                  size={24}
                  color={COLORS.text}
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Progress Text */}
            <Text style={styles.progressText}>
              {currentStep + 1} of {steps.length}
            </Text>
          </LinearGradient>
        </View>
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
  modalContainer: {
    width: width - SPACING.xl * 2,
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
