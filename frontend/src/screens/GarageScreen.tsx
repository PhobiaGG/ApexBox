import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import AddCarModal, { CarData } from '../components/AddCarModal';
import * as Haptics from 'expo-haptics';

export default function GarageScreen() {
  const { profile, addCar, setActiveCar, deleteCar, user, updateCar } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  // Remove duplicates and use unique IDs with index fallback
  const rawGarage = profile?.garage || [];
  const garage = rawGarage.map((car, index) => ({
    ...car,
    // If duplicate ID detected, use index-based unique key for rendering
    uniqueKey: `${car.id}-${index}`,
  }));
  
  // Detect duplicates
  React.useEffect(() => {
    const ids = rawGarage.map(c => c.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('[Garage] ⚠️ DUPLICATE CAR IDs DETECTED:', duplicates);
      Alert.alert(
        'Duplicate Cars Detected',
        'You have duplicate cars in your garage. This can cause deletion issues. Please contact support or delete all duplicates.',
        [{ text: 'OK' }]
      );
    }
  }, [rawGarage]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCar, setEditingCar] = useState<any>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleAddCar = async (carData: CarData) => {
    try {
      if (editingCar) {
        // Update existing car
        await deleteCar(editingCar.id);
        await addCar({ ...carData, id: editingCar.id });
        setEditingCar(null);
      } else {
        // Add new car
        await addCar(carData);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddModal(false);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', editingCar ? 'Failed to update car' : 'Failed to add car');
    }
  };

  const handleEditCar = (car: any) => {
    setEditingCar(car);
    setShowAddModal(true);
  };

  const handleSetActive = async (carId: string) => {
    Alert.alert(
      'Set Active Car',
      'Make this your active vehicle for telemetry logging?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Active',
          onPress: async () => {
            try {
              await setActiveCar(carId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Close any open swipeable
              swipeableRefs.current.forEach(swipeable => swipeable?.close());
            } catch (error) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to set active car');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (carId: string, carName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Car',
      `Remove "${carName}" from your garage?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            swipeableRefs.current.get(carId)?.close();
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Garage] Deleting car:', carId);
              await deleteCar(carId);
              console.log('[Garage] Car deleted successfully');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[Garage] Delete error:', error);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to delete car');
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, car: any) => {
    const trans = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          { transform: [{ translateX: trans }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleEditCar(car)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <View
            style={[
              styles.editButton,
              { backgroundColor: accentColor },
            ]}
          >
            <MaterialCommunityIcons name="pencil" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleDelete(car.id, car.nickname)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <View
            style={[
              styles.deleteButton,
              { backgroundColor: colors.magenta },
            ]}
          >
            <MaterialCommunityIcons name="delete" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Delete</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Garage</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not Logged In</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Sign in to manage your garage
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Garage</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {garage.length} {garage.length === 1 ? 'Vehicle' : 'Vehicles'}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {garage.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="car-off" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cars Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add your first vehicle to get started
            </Text>
          </View>
        ) : (
          garage.map((car) => (
            <Swipeable
              key={car.id}
              ref={(ref) => {
                if (ref) swipeableRefs.current.set(car.id, ref);
              }}
              renderRightActions={(progress, dragX) =>
                renderRightActions(progress, dragX, car)
              }
              overshootRight={false}
              friction={2}
              rightThreshold={40}
              onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <View
                style={[
                  styles.carCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  car.isActive && {
                    borderColor: accentColor,
                    borderWidth: 3,
                  },
                ]}
              >
                <View style={styles.carHeader}>
                  <MaterialCommunityIcons
                    name="car-sports"
                    size={40}
                    color={car.isActive ? accentColor : colors.textSecondary}
                  />
                  <View style={styles.carInfo}>
                    <Text style={[styles.carNickname, { color: colors.text }]}>
                      {car.nickname}
                    </Text>
                    <Text style={[styles.carDetails, { color: colors.textSecondary }]}>
                      {car.year} {car.make} {car.model}
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.background }]}
                      onPress={() => handleEditCar(car)}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color={colors.cyan} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.background }]}
                      onPress={() => handleDelete(car.id, car.nickname)}
                    >
                      <MaterialCommunityIcons name="delete" size={18} color={colors.magenta} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.carFooter}>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorSwatch, { borderColor: colors.border }]}>
                      <Text style={[styles.colorText, { color: colors.textTertiary }]}>
                        {car.color || 'No color'}
                      </Text>
                    </View>
                  </View>
                  {car.isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: accentColor }]}>
                      <Text style={[styles.activeBadgeText, { color: colors.background }]}>
                        ACTIVE
                      </Text>
                    </View>
                  )}
                </View>

                {car.upgrades && (
                  <View style={[styles.upgradesContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.upgradesHeader}>
                      <MaterialCommunityIcons
                        name="wrench"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.upgradesLabel, { color: colors.textSecondary }]}>
                        Upgrades
                      </Text>
                    </View>
                    <Text style={[styles.upgradesText, { color: colors.text }]}>
                      {car.upgrades}
                    </Text>
                  </View>
                )}

                {!car.isActive && (
                  <TouchableOpacity
                    style={styles.setActiveButton}
                    onPress={() => handleSetActive(car.id)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[accentColor, colors.background]}
                      style={styles.setActiveGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.text} />
                      <Text style={[styles.setActiveText, { color: colors.text }]}>
                        Set as Active
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </Swipeable>
          ))
        )}

        {/* Add Car Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddModal(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[accentColor, colors.background]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="plus" size={28} color={colors.text} />
            <Text style={[styles.addButtonText, { color: colors.text }]}>Add New Car</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      <AddCarModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCar(null);
        }}
        onSave={handleAddCar}
        accentColor={accentColor}
        editCar={editingCar}
      />
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
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  carCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  carInfo: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carNickname: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  carDetails: {
    fontSize: FONT_SIZE.md,
    marginTop: 4,
  },
  colorRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  colorSwatch: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  upgradesContainer: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  upgradesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  upgradesLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  upgradesText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  setActiveButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  setActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  setActiveText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    height: '100%',
  },
  editButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.xs,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: BORDER_RADIUS.lg,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  addButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  addButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  hintText: {
    fontSize: FONT_SIZE.sm,
  },
});
