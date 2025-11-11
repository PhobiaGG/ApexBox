# ApexBox OBD2 Bluetooth Integration - Implementation Summary

## Overview

This update enhances the ApexBox system to properly handle OBD2 Bluetooth communication between the Arduino ESP32 device and the mobile app. The changes ensure:

1. **Dedicated Bluetooth Page** - Easy OBD2 device scanning and pairing
2. **Non-blocking Scanning** - Real-time UI updates during BLE scanning
3. **Complete Data Telemetry** - All 10 OBD2 PIDs transmitted to app
4. **Data Logging** - All sensor and OBD2 data properly logged

## Changes Made

### Mobile App Changes (React Native/TypeScript)

#### 1. Updated `frontend/src/services/RealBleService.ts`

**Added extended OBD2 fields to TelemetryData interface:**
- `obdRPM` - Engine RPM
- `obdCoolantTemp` - Coolant temperature (°C)
- `obdThrottle` - Throttle position (0-100%)
- `obdFuel` - Fuel level (0-100%)
- `obdLoad` - Engine load (0-100%)
- `obdMAF` - Mass air flow (grams/sec)
- `obdIntakeTemp` - Intake air temperature (°C)
- `obdTiming` - Timing advance (degrees)
- `obdRuntime` - Engine runtime (seconds)

**Updated telemetry parsing** to capture all OBD2 fields from Arduino JSON:
```typescript
const telemetry: TelemetryData = {
  // ... existing fields ...

  // Extended OBD2 data
  obdRPM: jsonData.obdRPM,
  obdCoolantTemp: jsonData.obdCoolantTemp,
  obdThrottle: jsonData.obdThrottle,
  obdFuel: jsonData.obdFuel,
  obdLoad: jsonData.obdLoad,
  obdMAF: jsonData.obdMAF,
  obdIntakeTemp: jsonData.obdIntakeTemp,
  obdTiming: jsonData.obdTiming,
  obdRuntime: jsonData.obdRuntime,
};
```

#### 2. Updated `frontend/src/contexts/BleContext.tsx`

Synchronized TelemetryData interface to match RealBleService.

### Arduino Changes (ESP32/C++)

**See `ARDUINO_BLUETOOTH_PAGE_GUIDE.md` for detailed implementation instructions.**

Key additions:
1. **New PAGE_BLUETOOTH** - Dedicated page for OBD2 device management
2. **drawBluetoothPage()** - Renders scanning UI with device list
3. **updateBluetoothPage()** - Non-blocking UI updates during scan
4. **Device selection** - Use encoder to scroll through found devices
5. **Real-time updates** - UI refreshes as devices are discovered

## Data Flow

### Arduino → Phone App

**Telemetry JSON Format:**
```json
{
  "speed": 45.2,
  "rpm": 2500,
  "obdSpeed": 73,
  "temp": 25.5,
  "humidity": 45,
  "pressure": 1013.2,
  "altitude": 350.5,
  "heading": 180.0,
  "pitch": 2.5,
  "roll": -1.2,
  "lux": 450.0,
  "gas": 1200,
  "satellites": 8,
  "lat": 37.7749,
  "lon": -122.4194,
  "obdConnected": true,
  "obdRPM": 2500,
  "obdCoolantTemp": 85,
  "obdThrottle": 35,
  "obdFuel": 75,
  "obdLoad": 42,
  "obdMAF": 12,
  "obdIntakeTemp": 30,
  "obdTiming": 15,
  "obdRuntime": 3600
}
```

**Sent via BLE notifications every 500ms**

### Arduino SD Card Logging

**CSV Format (apexlog.csv):**
```csv
Time,Temp,Humidity,Pressure,Lux,Gas,GPS_Speed,Altitude,Lat,Lon,OBD_RPM,OBD_Speed,OBD_Coolant,OBD_Throttle,OBD_Fuel,OBD_Load,OBD_MAF,OBD_IntakeTemp,OBD_Timing,OBD_Runtime,Heading
10:30AM,25.5,45,1013.2,450,1200,45.2,350.5,37.7749,-122.4194,2500,73,85,35,75,42,12,30,15,3600,180
```

**Buffered writes** - Flushes every 10 entries for performance

### App Session Logging

**Stored in AsyncStorage:**
- Session metadata (duration, max speed, max g-force)
- Telemetry samples array
- GPS coordinates array

**Format:**
```json
{
  "samples": [
    {
      "timestamp_ms": 1234567890,
      "speed": 45.2,
      "g_force": 0.8,
      "temp": 25.5,
      "humidity": 45,
      "lux": 450,
      "altitude": 350.5
    }
  ],
  "duration": 3600,
  "maxSpeed": 120.5,
  "maxGForce": 1.2,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Bluetooth Page Features

### 1. Scanning
- **Trigger**: Click encoder button when on Bluetooth page
- **Duration**: 10 seconds
- **UI Updates**: Real-time as devices are found
- **Display**: Shows elapsed time and device count

### 2. Device List
- **Display**: Up to 3 devices visible
- **Information**: Device name + signal strength bars
- **Selection**: Scroll with encoder to highlight device
- **Connect**: Click encoder to connect to highlighted device

### 3. Connection Status
- **Scanning**: Blue accent, "Scanning... Xs"
- **Found**: White text, "X device(s) found"
- **Connecting**: Yellow text, "Connecting..."
- **Connected**: Green accent, device name shown
- **No devices**: Gray text, "No devices found"

### 4. Signal Strength Indicator
- **4 bars**: RSSI > -60 dBm (excellent)
- **3 bars**: RSSI > -70 dBm (good)
- **2 bars**: RSSI > -80 dBm (fair)
- **1 bar**: RSSI ≤ -80 dBm (weak)

## Testing Checklist

### Arduino Testing

- [ ] Bluetooth page appears in navigation cycle
- [ ] Scan starts when button pressed on Bluetooth page
- [ ] Devices appear in list as they're found
- [ ] Encoder scroll selects different devices
- [ ] Selected device is highlighted
- [ ] Connection succeeds when device selected
- [ ] Connection status updates properly
- [ ] Can disconnect and rescan
- [ ] Other pages still work correctly
- [ ] Status bar shows connection indicators

### App Testing

- [ ] App receives telemetry data
- [ ] All OBD2 fields display correctly
- [ ] RPM, speed, temp, throttle, fuel show accurate values
- [ ] Dashboard updates in real-time
- [ ] Session recording includes all data
- [ ] Logs saved correctly to AsyncStorage
- [ ] Can view past sessions
- [ ] Can export session data
- [ ] Connection indicator shows OBD2 status
- [ ] Reconnects after app restart (if remembered)

### Integration Testing

- [ ] Arduino sends all 10 OBD2 PIDs
- [ ] App receives all 10 OBD2 fields
- [ ] Data matches between Arduino display and app
- [ ] SD card logs match app logs
- [ ] No crashes during connection/disconnection
- [ ] Memory usage stable during long sessions
- [ ] BLE notifications work reliably
- [ ] Can handle connection loss gracefully

## Troubleshooting

### Arduino won't scan for devices
**Check:**
- BLE initialized in setup()
- PAGE_BLUETOOTH added to enum
- drawBluetoothPage() function exists
- Encoder button handler calls startManualOBDScan()

### Devices found but can't connect
**Check:**
- Device UUIDs match (serviceUUID, rxUUID, txUUID)
- OBD2 adapter is powered on
- OBD2 adapter is in pairing mode
- Not already connected to another device

### App doesn't receive OBD2 data
**Check:**
- RealBleService.ts updated with new fields
- BleContext.tsx interface matches
- Arduino telemetry JSON includes obdXXX fields
- BLE characteristic notifications enabled
- Phone Bluetooth permissions granted

### Data not logging
**Arduino SD card:**
- Check SD card formatted (FAT32)
- SD_CS pin correct (14)
- logFile opened successfully
- Buffer flushing on disconnect

**App AsyncStorage:**
- Check session recording started
- LogService saving correctly
- Check AsyncStorage not full
- Check for JSON parse errors

## Performance Notes

### Arduino Optimizations
- **Display updates**: 150ms (was 250ms)
- **OBD2 polling**: 150ms for 10 PIDs
- **SD card buffering**: Writes every 10 entries
- **Smart UI updates**: Only redraws changed elements
- **Non-blocking scans**: UI responsive during BLE scan

### App Optimizations
- **BLE scan**: 10 second timeout
- **Telemetry rate**: 500ms updates
- **AsyncStorage**: Sanitizes NaN/Infinity
- **Session caching**: Reduces storage reads

## Files Modified

### Mobile App
- `frontend/src/services/RealBleService.ts` ✅
- `frontend/src/contexts/BleContext.tsx` ✅

### Arduino (Guide Created)
- See `ARDUINO_BLUETOOTH_PAGE_GUIDE.md` for implementation

## Next Steps

1. **Implement Arduino changes** following the guide
2. **Test end-to-end** data flow
3. **Verify logging** on both Arduino and app
4. **Test in vehicle** with real OBD2 adapter
5. **Optimize** based on real-world performance

## Support

For issues or questions:
1. Check `ARDUINO_BLUETOOTH_PAGE_GUIDE.md` for implementation details
2. Review telemetry JSON format above
3. Use Serial monitor on Arduino for debugging
4. Check React Native logs for app issues
5. Verify BLE UUIDs match on both sides

---

**Version**: 2.0
**Date**: 2025-01-15
**Author**: Claude (ApexBox Development Team)
