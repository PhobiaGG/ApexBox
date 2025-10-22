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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBle } from '../contexts/BleContext';
import UserAvatar from '../components/UserAvatar';
import AddCarModal, { CarData } from '../components/AddCarModal';
import ChangeUsernameModal from '../components/ChangeUsernameModal';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LeaderboardService from '../services/LeaderboardService';

export default function SettingsScreen() {
  const { settings, updateUnits, toggleDeveloperMode, resetSettings } = useSettings();
  const { mode, colors, accentColor, setAccentColor, getCurrentAccent, toggleMode } = useTheme();
  const { profile, updateUsername, uploadAvatar, addCar, setActiveCar, deleteCar, signOut, updateUserState } = useAuth();
  const { forgetDevice } = useBle();

  const garage = profile?.garage || [];
  const router = useRouter();
  
  const [tapCount, setTapCount] = useState(0);
  const [carModel, setCarModel] = useState(profile?.carModel || '');
  const [carYear, setCarYear] = useState(profile?.carYear || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  const accentColorValue = getCurrentAccent();

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

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setUploadingAvatar(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const downloadURL = await uploadAvatar(result.assets[0].uri);
        await updateProfile({ avatarURI: downloadURL });
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Avatar updated!');
      } catch (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to upload avatar');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ carModel, carYear });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangeUsername = async (newUsername: string) => {
    try {
      await updateUsername(newUsername);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update username');
    }
  };

  const handleForgetDevice = async () => {
    Alert.alert(
      'Forget Device',
      'This will clear the remembered ApexBox device. You\'ll need to manually reconnect next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await forgetDevice();
              Alert.alert('Success', 'Device forgotten. You can reconnect from the Dashboard.');
            } catch (error) {
              Alert.alert('Error', 'Failed to forget device');
            }
          },
        },
      ]
    );
  };

  const handleSaveCar = async (carData: CarData) => {
    await addCar(carData);
  };

  const handleSetActive = async (carId: string) => {
    await setActiveCar(carId);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Active Car Changed', 'This car is now active for telemetry');
  };

  const handleDeleteCar = (carId: string) => {
    Alert.alert('Delete Car', 'Remove from garage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCar(carId);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await signOut();
          router.replace('/login');
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, garage, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await deleteAccount();
            router.replace('/login');
          }
        }
      ]
    );
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
            Alert.alert('Reset Complete', 'All settings restored to defaults');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* ========== PROFILE SECTION ========== */}
        {profile && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
            
            <View style={styles.profileHeader}>
              <UserAvatar 
                uri={profile.avatarURI} 
                name={profile.displayName} 
                size={80}
                borderColor={accentColorValue}
              />
              <TouchableOpacity 
                style={styles.changeAvatarButton} 
                onPress={handleChangeAvatar}
                disabled={uploadingAvatar}
              >
                <LinearGradient 
                  colors={[accentColorValue, colors.background]}
                  style={styles.avatarButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons 
                    name={uploadingAvatar ? "loading" : "camera"} 
                    size={18} 
                    color={colors.text} 
                  />
                  <Text style={[styles.avatarButtonText, { color: colors.text }]}>
                    {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{profile.displayName}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{profile.email}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.infoRow, { borderBottomColor: 'transparent' }]}
                onPress={() => setShowStateModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
                <View style={styles.stateValueContainer}>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {profile.state ? 
                      LeaderboardService.getUSStates().find(s => s.code === profile.state)?.name || 'Not Set'
                      : 'Not Set'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.changeUsernameButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowChangeUsername(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[accentColorValue, colors.background]}
                style={styles.changeUsernameGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="account-edit" size={20} color={colors.text} />
                <Text style={[styles.changeUsernameText, { color: colors.text }]}>
                  Change Username
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ========== GARAGE SECTION ========== */}
        {profile && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Garage</Text>
            
            {garage.length === 0 ? (
              <View style={styles.emptyGarage}>
                <MaterialCommunityIcons 
                  name="car-off" 
                  size={48} 
                  color={colors.textSecondary} 
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No cars in your garage
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                  Add one to start tracking!
                </Text>
              </View>
            ) : (
              garage.map((car) => (
                <View 
                  key={car.id} 
                  style={[
                    styles.carCard,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    car.isActive && { 
                      borderColor: accentColorValue, 
                      borderWidth: 3,
                    }
                  ]}
                >
                  <View style={styles.carHeader}>
                    <MaterialCommunityIcons 
                      name="car-sports" 
                      size={32} 
                      color={car.isActive ? accentColorValue : colors.textSecondary} 
                    />
                    <View style={styles.carInfo}>
                      <Text style={[styles.carNickname, { color: colors.text }]}>
                        {car.nickname}
                      </Text>
                      <Text style={[styles.carDetails, { color: colors.textSecondary }]}>
                        {car.year} {car.make} {car.model}
                      </Text>
                      <Text style={[styles.carColor, { color: colors.textTertiary }]}>
                        {car.color}
                      </Text>
                    </View>
                    {car.isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: accentColorValue }]}>
                        <Text style={[styles.activeBadgeText, { color: colors.text }]}>
                          ACTIVE
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.carActions}>
                    {!car.isActive && (
                      <TouchableOpacity onPress={() => handleSetActive(car.id)}>
                        <Text style={[styles.actionText, { color: accentColorValue }]}>
                          Set Active
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteCar(car.id)}>
                      <Text style={[styles.actionText, { color: colors.magenta }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity 
              style={styles.addCarButton} 
              onPress={() => setShowAddCar(true)}
            >
              <LinearGradient 
                colors={[accentColorValue, colors.background]}
                style={styles.addCarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
                <Text style={[styles.addCarText, { color: colors.text }]}>Add New Car</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ========== APPEARANCE SECTION ========== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          {/* Dark/Light Mode Toggle */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons 
                name={mode === 'dark' ? 'weather-night' : 'weather-sunny'} 
                size={24} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await toggleMode();
              }}
              trackColor={{ false: colors.border, true: accentColorValue }}
              thumbColor={colors.text}
            />
          </View>

          {/* Accent Color Picker */}
          <View style={styles.accentColorContainer}>
            <Text style={[styles.accentLabel, { color: colors.textSecondary }]}>
              ACCENT COLOR
            </Text>
            <View style={styles.colorGrid}>
              <TouchableOpacity
                style={[
                  styles.colorOption,
                  { 
                    borderColor: colors.cyan,
                    borderWidth: accentColor === 'cyan' ? 3 : 1,
                    backgroundColor: colors.background,
                  }
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setAccentColor('cyan');
                }}
              >
                <View style={[styles.colorCircle, { backgroundColor: colors.cyan }]} />
                <Text style={[styles.colorLabel, { color: colors.text }]}>Cyan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.colorOption,
                  { 
                    borderColor: colors.magenta,
                    borderWidth: accentColor === 'magenta' ? 3 : 1,
                    backgroundColor: colors.background,
                  }
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setAccentColor('magenta');
                }}
              >
                <View style={[styles.colorCircle, { backgroundColor: colors.magenta }]} />
                <Text style={[styles.colorLabel, { color: colors.text }]}>Magenta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.colorOption,
                  { 
                    borderColor: colors.lime,
                    borderWidth: accentColor === 'lime' ? 3 : 1,
                    backgroundColor: colors.background,
                  }
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setAccentColor('lime');
                }}
              >
                <View style={[styles.colorCircle, { backgroundColor: colors.lime }]} />
                <Text style={[styles.colorLabel, { color: colors.text }]}>Lime</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ========== UNITS SECTION (UNIFIED) ========== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Units & Display</Text>
          
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {settings.units.isMetric ? 'Metric System (km/h, °C, m)' : 'Imperial System (mph, °F, ft)'}
            </Text>
            <Switch
              value={settings.units.isMetric}
              onValueChange={async (value) => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await updateUnits({ 
                  isMetric: value,
                  tempCelsius: value,
                  altitudeMetric: value
                });
              }}
              trackColor={{ false: colors.border, true: accentColorValue }}
              thumbColor={colors.text}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>24-Hour Time</Text>
            <Switch
              value={settings.units.time24Hour}
              onValueChange={async (value) => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await updateUnits({ time24Hour: value });
              }}
              trackColor={{ false: colors.border, true: accentColorValue }}
              thumbColor={colors.text}
            />
          </View>
        </View>

        {/* ========== CONNECTIVITY SECTION ========== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connectivity</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: 'transparent' }]} 
            onPress={handleForgetDevice}
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="bluetooth-off" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text, marginLeft: SPACING.sm }]}>
                Forget Remembered Device
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.connectivityHint, { color: colors.textTertiary }]}>
            Clear saved ApexBox device for auto-connect
          </Text>
        </View>

        {/* ========== PREMIUM SECTION ========== */}
        {!profile?.premium && (
          <TouchableOpacity
            style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: accentColorValue }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/premium');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[accentColorValue + '40', colors.card]}
              style={styles.premiumGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.premiumContent}>
                <MaterialCommunityIcons name="crown" size={32} color={accentColorValue} />
                <View style={styles.premiumText}>
                  <Text style={[styles.premiumTitle, { color: colors.text }]}>Upgrade to Pro</Text>
                  <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
                    Unlock Track Replay & Crew Leaderboards
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={accentColorValue} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ========== SYSTEM SECTION ========== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>System</Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: colors.border }]} 
            onPress={handleVersionTap}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </TouchableOpacity>

          {settings.developerMode && (
            <View style={[styles.developerBadge, { backgroundColor: colors.magenta }]}>
              <MaterialCommunityIcons name="code-braces" size={16} color={colors.text} />
              <Text style={[styles.developerText, { color: colors.text }]}>
                Developer Mode Active
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={handleResetAll}
          >
            <Text style={[styles.dangerButtonText, { color: colors.magenta }]}>
              Reset All Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========== ACCOUNT ACTIONS ========== */}
        {profile && (
          <View style={styles.accountActions}>
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color={colors.text} />
              <Text style={[styles.logoutText, { color: colors.text }]}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.deleteButton, { borderColor: colors.magenta }]} 
              onPress={handleDeleteAccount}
            >
              <MaterialCommunityIcons name="delete-forever" size={20} color={colors.magenta} />
              <Text style={[styles.deleteText, { color: colors.magenta }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <AddCarModal
        visible={showAddCar}
        onClose={() => setShowAddCar(false)}
        onSave={handleSaveCar}
        accentColor={accentColorValue}
      />

      <ChangeUsernameModal
        visible={showChangeUsername}
        currentUsername={profile?.displayName || ''}
        onClose={() => setShowChangeUsername(false)}
        onSave={handleChangeUsername}
      />

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStateModal(false)}
        >
          <View style={[styles.stateModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Your State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.stateList}>
              {LeaderboardService.getUSStates().map(state => (
                <TouchableOpacity
                  key={state.code}
                  style={[
                    styles.stateItem,
                    { borderBottomColor: colors.border },
                    profile?.state === state.code && { backgroundColor: `${accentColorValue}20` }
                  ]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    try {
                      await updateUserState(state.code);
                      setShowStateModal(false);
                      Alert.alert('Success', `Location set to ${state.name}`);
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  }}
                >
                  <Text style={[
                    styles.stateItemText,
                    { color: profile?.state === state.code ? accentColorValue : colors.text }
                  ]}>
                    {state.name}
                  </Text>
                  {profile?.state === state.code && (
                    <MaterialCommunityIcons name="check" size={20} color={accentColorValue} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  changeAvatarButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  avatarButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  avatarButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  profileInfo: {
    gap: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  statePicker: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
  changeUsernameButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  changeUsernameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  changeUsernameText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  emptyGarage: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.sm,
  },
  emptyHint: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  carCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  carInfo: {
    flex: 1,
  },
  carNickname: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  carDetails: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  carColor: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  carActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'flex-end',
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  addCarButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  addCarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  addCarText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZE.md,
  },
  settingValue: {
    fontSize: FONT_SIZE.md,
  },
  accentColorContainer: {
    paddingTop: SPACING.md,
  },
  accentLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.md,
    letterSpacing: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  colorOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: SPACING.xs,
  },
  colorLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  developerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginVertical: SPACING.sm,
    alignSelf: 'flex-start',
  },
  developerText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectivityHint: {
    fontSize: FONT_SIZE.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  premiumCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: FONT_SIZE.sm,
  },
  dangerButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  accountActions: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  deleteText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
});
