import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import * as Haptics from 'expo-haptics';
import RevenueCatService from '../src/services/RevenueCatService';

export default function PremiumScreen() {
  const router = useRouter();
  const { profile, upgradeToPremium } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoadingOfferings(true);
      await RevenueCatService.initialize(profile?.email);
      const offering = await RevenueCatService.getOfferings();
      setOfferings(offering);
      console.log('[Premium] Loaded offerings:', offering);
    } catch (error) {
      console.error('[Premium] Error loading offerings:', error);
      // Fallback to mock mode if RevenueCat not available
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Use real RevenueCat if available
      if (offerings && offerings.availablePackages && offerings.availablePackages.length > 0) {
        console.log('[Premium] Initiating real purchase...');
        const result = await RevenueCatService.purchasePackage(offerings.availablePackages[0]);
        
        if (result.success) {
          // Upgrade user to premium in Firebase
          await upgradeToPremium();
          
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Welcome to Pro!',
            'Your premium features are now unlocked!',
            [{ text: 'Awesome!', onPress: () => router.back() }]
          );
        } else {
          throw new Error(result.error || 'Purchase failed');
        }
      } else {
        // Fallback to mock purchase if RevenueCat not available
        console.log('[Premium] Using mock purchase (RevenueCat not available)');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await upgradeToPremium();
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Welcome to Pro! (Mock)',
          'Your premium features are now unlocked! Note: This is a mock purchase for testing.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Purchase Failed', error.message || 'An error occurred');
    } finally {
      setPurchasing(false);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (profile?.premium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.alreadyProContainer}>
          <LinearGradient
            colors={[accentColor, colors.background]}
            style={styles.badgeGradient}
          >
            <MaterialCommunityIcons name="crown" size={60} color={colors.text} />
          </LinearGradient>
          <Text style={[styles.alreadyProTitle, { color: colors.text }]}>You're Already Pro!</Text>
          <Text style={[styles.alreadyProSubtitle, { color: colors.textSecondary }]}>
            Enjoy all premium features
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[accentColor, colors.background]}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="crown" size={48} color={colors.text} />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.text }]}>ApexBox Pro Pack</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock premium performance tracking features
          </Text>
        </View>

        {/* Price */}
        <View style={[styles.priceContainer, { backgroundColor: colors.card, borderColor: accentColor }]}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>One-time unlock</Text>
          <Text style={[styles.price, { color: accentColor }]}>$4.99</Text>
          <Text style={[styles.priceNote, { color: colors.textTertiary }]}>No subscription • Lifetime access</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>What's Included</Text>

          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialCommunityIcons name="map-marker-path" size={32} color={accentColor} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Track Map Replay</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Visualize your entire session path with animated GPS tracking and acceleration vectors.
                See exactly where you braked, accelerated, and cornered.
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialCommunityIcons name="trophy-outline" size={32} color={accentColor} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Crew Leaderboards</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Create or join crews and compare performance with friends. Track fastest speeds,
                highest G-forces, and total sessions in real-time rankings.
              </Text>
            </View>
          </View>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[accentColor, colors.background]}
            style={styles.purchaseGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {purchasing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator color={colors.text} size="small" />
                <Text style={[styles.processingText, { color: colors.text }]}>
                  Processing purchase...
                </Text>
              </View>
            ) : (
              <View style={styles.purchaseContent}>
                <MaterialCommunityIcons name="lock-open" size={24} color={colors.text} />
                <Text style={[styles.purchaseText, { color: colors.text }]}>Unlock Pro Pack</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          This is a one-time purchase with lifetime access. No hidden fees or subscriptions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  priceContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.xl,
  },
  priceLabel: {
    fontSize: FONT_SIZE.sm,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  price: {
    fontSize: 56,
    fontWeight: 'bold',
    marginVertical: SPACING.xs,
  },
  priceNote: {
    fontSize: FONT_SIZE.sm,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featuresTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  featureCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  purchaseButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  purchaseGradient: {
    paddingVertical: SPACING.lg,
  },
  purchaseContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  purchaseText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  processingText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  alreadyProContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  alreadyProTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  alreadyProSubtitle: {
    fontSize: FONT_SIZE.md,
  },
});
