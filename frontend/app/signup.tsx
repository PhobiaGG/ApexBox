import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    console.log('[SignUp] Starting signup process...');
    console.log('[SignUp] Display Name:', displayName);
    console.log('[SignUp] Email:', email);
    
    if (!validateInputs()) {
      console.log('[SignUp] Validation failed');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('[SignUp] Calling signUp function...');
      await signUp(email, password, displayName);
      
      console.log('[SignUp] Signup successful!');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Account Created!',
        'Your ApexBox account has been created successfully.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      console.error('[SignUp] Error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign Up Failed', error.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={accentColor} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="account-plus" size={64} color={accentColor} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the ApexBox Community</Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor={COLORS.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[accentColor, COLORS.background]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-check" size={24} color={COLORS.text} />
                    <Text style={styles.buttonText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.terms}>
              By signing up, you agree to ApexBox's Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  signUpButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  terms: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
