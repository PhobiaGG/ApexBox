import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBle } from '../contexts/BleContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { BleDevice } from '../services/MockBleService';
import * as Haptics from 'expo-haptics';

interface BleConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
}

export default function BleConnectionModal({ visible, onClose, accentColor }: BleConnectionModalProps) {
  const { status, devices, scan, connect, disconnect } = useBle();
  const { colors } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);

  // Auto-scan when modal opens
  useEffect(() => {
    if (visible && devices.length === 0 && !scanning) {
      handleScan();
    }
  }, [visible]);

  // Update scanning state based on BLE status
  useEffect(() => {
    if (status.isScanning) {
      setScanning(true);
    }
  }, [status.isScanning]);

  const handleScan = async () => {
    try {
      setScanning(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Scan with visible feedback
      await scan();
      
      // Keep scanning indicator for at least 1 second for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BleDevice) => {
    try {
      setConnecting(true);
      setSelectedDevice(device);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await connect(device);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Connected',
        `Successfully connected to ${device.name}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '⚠️ Connection Failed',
        'Could not connect to device. Running in simulation mode.',
        [{ text: 'OK' }]
      );
      // Even on failure, the service falls back to mock mode
      onClose();
    } finally {
      setConnecting(false);
      setSelectedDevice(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await disconnect();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Disconnect error:', error);
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackType.Light);
    onClose();
  };

  const getSignalIcon = (rssi?: number) => {
    if (!rssi) return 'signal-cellular-outline';
    if (rssi > -50) return 'signal-cellular-3';
    if (rssi > -70) return 'signal-cellular-2';
    return 'signal-cellular-1';
  };

  const getSignalColor = (rssi?: number) => {
    if (!rssi) return colors.textSecondary;
    if (rssi > -50) return '#00FF88';
    if (rssi > -70) return '#FFAA00';
    return '#FF0055';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialCommunityIcons name="bluetooth" size={32} color={accentColor} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {status.isConnected ? 'BLE Connected' : 'Connect ApexBox'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {status.isConnected 
                ? `Connected to ${status.connectedDevice?.name}` 
                : 'Scan for nearby ApexBox devices'}
            </Text>
          </View>

          {/* Content */}
          {status.isConnected ? (
            <View style={styles.connectedContainer}>
              <View style={[styles.connectedDevice, { backgroundColor: colors.background, borderColor: accentColor }]}>
                <MaterialCommunityIcons name="car-sports" size={40} color={accentColor} />
                <Text style={[styles.connectedDeviceName, { color: colors.text }]}>
                  {status.connectedDevice?.name}
                </Text>
                <View style={[styles.connectedBadge, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.background} />
                  <Text style={[styles.connectedBadgeText, { color: colors.background }]}>
                    ACTIVE
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.disconnectButton, { borderColor: colors.magenta }]}
                onPress={handleDisconnect}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="power" size={20} color={colors.magenta} />
                <Text style={[styles.disconnectText, { color: colors.magenta }]}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Device List */}
              <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
                {scanning ? (
                  <View style={styles.scanningContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.scanningText, { color: colors.textSecondary }]}>
                      Scanning for ApexBox devices...
                    </Text>
                    <TouchableOpacity
                      style={[styles.cancelScanButton, { borderColor: colors.border }]}
                      onPress={handleCancel}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.cancelScanText, { color: colors.textSecondary }]}>
                        Cancel Scan
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : devices.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="bluetooth-off" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No devices found
                    </Text>
                    <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                      Make sure your ApexBox is powered on
                    </Text>
                  </View>
                ) : (
                  devices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      style={[styles.deviceCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handleConnect(device)}
                      disabled={connecting}
                      activeOpacity={0.8}
                    >
                      <View style={styles.deviceInfo}>
                        <MaterialCommunityIcons name="car-sports" size={32} color={accentColor} />
                        <View style={styles.deviceDetails}>
                          <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                          <Text style={[styles.deviceId, { color: colors.textSecondary }]}>
                            ID: {device.id.slice(0, 8)}...
                          </Text>
                        </View>
                      </View>

                      <View style={styles.deviceActions}>
                        <MaterialCommunityIcons 
                          name={getSignalIcon(device.rssi)} 
                          size={20} 
                          color={getSignalColor(device.rssi)} 
                        />
                        {connecting && selectedDevice?.id === device.id ? (
                          <ActivityIndicator size="small" color={accentColor} style={styles.connectingSpinner} />
                        ) : (
                          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Scan Button */}
              {!scanning && (
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScan}
                  disabled={scanning}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[accentColor, colors.background]}
                    style={styles.scanGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="radar" size={20} color={colors.text} />
                    <Text style={[styles.scanText, { color: colors.text }]}>
                      {devices.length > 0 ? 'Scan Again' : 'Start Scan'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: colors.border }]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
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
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  deviceList: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  scanningText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  cancelScanButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  cancelScanText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceDetails: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  deviceName: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  connectingSpinner: {
    marginLeft: SPACING.xs,
  },
  connectedContainer: {
    marginBottom: SPACING.md,
  },
  connectedDevice: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.md,
  },
  connectedDeviceName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  connectedBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  disconnectText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  scanButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  scanText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
