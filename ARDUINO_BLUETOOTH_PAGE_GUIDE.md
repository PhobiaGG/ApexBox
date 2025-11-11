# Arduino Code Updates - Bluetooth Page & Enhanced OBD2 Integration

This guide shows exactly what changes you need to make to your Arduino code to:
1. Add a dedicated Bluetooth page for OBD2 device scanning and selection
2. Ensure non-blocking UI updates during scanning
3. Ensure all OBD2 data is properly sent to the phone app

## 1. Update Page Enum

**Find this line (around line 112):**
```cpp
enum PageId { PAGE_DRIVE, PAGE_SENSORS, PAGE_GPS, PAGE_CONNECT, PAGE_SETTINGS };
```

**Change to:**
```cpp
enum PageId { PAGE_DRIVE, PAGE_SENSORS, PAGE_GPS, PAGE_CONNECT, PAGE_BLUETOOTH, PAGE_SETTINGS };
```

## 2. Update Page Navigation

**Find the `showPage()` function and update the switch statement:**

**OLD:**
```cpp
switch (currentPage) {
  case PAGE_DRIVE:    drawDrivePage(); break;
  case PAGE_SENSORS:  drawSensorsPage(); break;
  case PAGE_GPS:      drawGPSPage(); break;
  case PAGE_CONNECT:  drawConnectPage(); break;
  case PAGE_SETTINGS: drawSettingsPage(); break;
}
```

**NEW:**
```cpp
switch (currentPage) {
  case PAGE_DRIVE:      drawDrivePage(); break;
  case PAGE_SENSORS:    drawSensorsPage(); break;
  case PAGE_GPS:        drawGPSPage(); break;
  case PAGE_CONNECT:    drawConnectPage(); break;
  case PAGE_BLUETOOTH:  drawBluetoothPage(); break;
  case PAGE_SETTINGS:   drawSettingsPage(); break;
}
```

**Similarly update `updatePageData()` function:**

**OLD:**
```cpp
switch (currentPage) {
  case PAGE_DRIVE:   updateDrivePage(); break;
  case PAGE_SENSORS: updateSensorsPage(); break;
  case PAGE_GPS:     updateGPSPage(); break;
  case PAGE_CONNECT: updateConnectPage(); break;
}
```

**NEW:**
```cpp
switch (currentPage) {
  case PAGE_DRIVE:     updateDrivePage(); break;
  case PAGE_SENSORS:   updateSensorsPage(); break;
  case PAGE_GPS:       updateGPSPage(); break;
  case PAGE_CONNECT:   updateConnectPage(); break;
  case PAGE_BLUETOOTH: updateBluetoothPage(); break;
}
```

## 3. Add Bluetooth Page Drawing Function

**Add this new function after your existing page drawing functions:**

```cpp
void drawBluetoothPage() {
  tft.fillScreen(COLOR_BLACK);
  drawStatusBar();

  int yPos = STATUS_BAR_HEIGHT + MARGIN;

  // Title
  tft.setFont(&FreeSansBold12pt7b);
  tft.setTextColor(COLOR_BLUE_BRIGHT);
  tft.setCursor(MARGIN, yPos + 15);
  tft.print("OBD2 SCANNER");

  updateBluetoothPage();
}

void updateBluetoothPage() {
  static String lastScanStatus = "";
  static int lastDeviceCount = -1;
  static int lastSelectedIndex = -1;
  static OBDState lastObdState = OBD_DISCONNECTED;

  int yPos = STATUS_BAR_HEIGHT + MARGIN + 25;

  // Scan status card
  String scanStatus = "";
  uint16_t statusColor = COLOR_GRAY_LIGHT;

  if (isScanning) {
    unsigned long elapsed = (millis() - scanStartTime) / 1000;
    scanStatus = "Scanning... " + String(elapsed) + "s";
    statusColor = COLOR_BLUE_BRIGHT;
  } else if (obdConnected) {
    scanStatus = "Connected";
    statusColor = COLOR_GREEN;
  } else if (bleConnecting) {
    scanStatus = "Connecting...";
    statusColor = COLOR_YELLOW;
  } else if (foundOBDDevices.size() > 0) {
    scanStatus = String(foundOBDDevices.size()) + " device(s) found";
    statusColor = COLOR_WHITE;
  } else {
    scanStatus = "No devices found";
    statusColor = COLOR_GRAY_LIGHT;
  }

  // Only redraw if status changed
  if (scanStatus != lastScanStatus || obdState != lastObdState) {
    tft.fillRect(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2, 30, COLOR_BLACK);

    drawModernCard(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2, 30,
                   isScanning ? COLOR_BLUE_BRIGHT : 0);

    tft.setFont(&FreeSans9pt7b);
    tft.setTextColor(statusColor);
    tft.setCursor(MARGIN + 10, yPos + 20);
    tft.print(scanStatus);

    lastScanStatus = scanStatus;
    lastObdState = obdState;
  }

  yPos += 40;

  // Scan button (if not scanning)
  if (!isScanning && !bleConnecting) {
    if (lastDeviceCount != foundOBDDevices.size() || obdState != lastObdState) {
      tft.fillRect(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2, 35, COLOR_BLACK);

      drawModernCard(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2, 35, COLOR_GREEN);

      tft.setFont(&FreeSansBold12pt7b);
      tft.setTextColor(COLOR_WHITE);
      int16_t x1, y1;
      uint16_t w, h;
      const char* btnText = obdConnected ? "Disconnect" : "Scan for Devices";
      tft.getTextBounds(btnText, 0, 0, &x1, &y1, &w, &h);
      tft.setCursor(MARGIN + (SCREEN_WIDTH - MARGIN*2 - w) / 2, yPos + 23);
      tft.print(btnText);
    }
    yPos += 45;
  } else {
    yPos += 45;
  }

  // Device list
  if (foundOBDDevices.size() > 0 && !obdConnected) {
    // Redraw device list only if device count or selection changed
    if (foundOBDDevices.size() != lastDeviceCount || selectedOBDIndex != lastSelectedIndex) {
      // Clear device list area
      tft.fillRect(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2,
                   SCREEN_HEIGHT - yPos - MARGIN, COLOR_BLACK);

      // Show up to 3 devices
      int maxVisible = min((int)foundOBDDevices.size(), 3);
      for (int i = 0; i < maxVisible; i++) {
        bool isSelected = (i == selectedOBDIndex);
        uint16_t accentColor = isSelected ? COLOR_BLUE_BRIGHT : 0;

        drawModernCard(MARGIN, yPos + i * 45, SCREEN_WIDTH - MARGIN*2, 40, accentColor);

        // Device name
        tft.setFont(&FreeSans9pt7b);
        tft.setTextColor(isSelected ? COLOR_WHITE : COLOR_GRAY_LIGHT);
        tft.setCursor(MARGIN + 10, yPos + i * 45 + 18);

        String displayName = foundOBDDevices[i].name;
        if (displayName.length() > 20) {
          displayName = displayName.substring(0, 17) + "...";
        }
        tft.print(displayName);

        // Signal strength
        int rssi = foundOBDDevices[i].rssi;
        int bars = 1;
        if (rssi > -60) bars = 4;
        else if (rssi > -70) bars = 3;
        else if (rssi > -80) bars = 2;

        int barX = SCREEN_WIDTH - MARGIN - 40;
        for (int b = 0; b < bars; b++) {
          int barH = 4 + b * 3;
          int barY = yPos + i * 45 + 25 - barH;
          tft.fillRect(barX + b * 8, barY, 6, barH,
                      isSelected ? COLOR_BLUE_BRIGHT : COLOR_GREEN);
        }
      }

      lastDeviceCount = foundOBDDevices.size();
      lastSelectedIndex = selectedOBDIndex;
    }
  } else if (obdConnected) {
    // Show connected device info
    if (obdState != lastObdState) {
      tft.fillRect(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2,
                   SCREEN_HEIGHT - yPos - MARGIN, COLOR_BLACK);

      drawModernCard(MARGIN, yPos, SCREEN_WIDTH - MARGIN*2, 60, COLOR_GREEN);

      tft.setFont(&FreeSansBold12pt7b);
      tft.setTextColor(COLOR_WHITE);
      tft.setCursor(MARGIN + 10, yPos + 20);
      tft.print("CONNECTED");

      tft.setFont(&FreeSans9pt7b);
      tft.setTextColor(COLOR_GRAY_LIGHT);
      tft.setCursor(MARGIN + 10, yPos + 45);
      tft.print(String(obd2Settings.deviceName));
    }
  }

  lastObdState = obdState;
}
```

## 4. Update Status Bar Titles

**Find the `drawStatusBar()` function and update the titles array:**

**OLD:**
```cpp
const char* titles[] = {"DRIVE", "SENSORS", "GPS", "CONNECT", "SETTINGS"};
```

**NEW:**
```cpp
const char* titles[] = {"DRIVE", "SENSORS", "GPS", "CONNECT", "BLUETOOTH", "SETTINGS"};
```

## 5. Update Button Handler for Bluetooth Page

**In the `handleEncoderButton()` function, add handling for the Bluetooth page:**

**Find where it handles page cycling (around line with `currentPage = (currentPage + 1) % PAGE_SETTINGS;`)**

**Change:**
```cpp
else {
  currentPage = (currentPage + 1) % PAGE_SETTINGS;
  showPage();
}
```

**To:**
```cpp
else {
  // Cycle through pages
  currentPage = (currentPage + 1) % PAGE_SETTINGS;
  showPage();
}
```

**And add this new section in the encoder button handler for selecting devices on Bluetooth page:**

**Add after the existing `handleEncoderButton()` logic:**

```cpp
// Additional logic for Bluetooth page device selection
if (currentPage == PAGE_BLUETOOTH && !inSettings) {
  if (held < 600) {
    // Short press on Bluetooth page
    if (!isScanning && !bleConnecting) {
      if (obdConnected) {
        // Disconnect if already connected
        if (pClient) {
          pClient->disconnect();
        }
      } else if (foundOBDDevices.size() > 0) {
        // Connect to selected device
        obdDevice = foundOBDDevices[selectedOBDIndex].device;
        bleScanComplete = true;
        obdState = OBD_CONNECTING;
      } else {
        // Start scan
        startManualOBDScan();
      }
    }
  }
  showPage();
  beep();
  return; // Don't cycle pages
}
```

## 6. Update Encoder Scroll for Device Selection

**Add to `handleEncoderScroll()` function:**

**Add this section at the beginning:**

```cpp
void handleEncoderScroll() {
  static int lastState = HIGH;
  int state = digitalRead(ENC_CLK);

  if (state != lastState && state == LOW) {
    // Bluetooth page device selection
    if (currentPage == PAGE_BLUETOOTH && !isScanning && !obdConnected && foundOBDDevices.size() > 0) {
      if (digitalRead(ENC_DT) != state) {
        selectedOBDIndex = (selectedOBDIndex + 1) % foundOBDDevices.size();
      } else {
        selectedOBDIndex = (selectedOBDIndex - 1 + foundOBDDevices.size()) % foundOBDDevices.size();
      }
      updateBluetoothPage();
      beep();
    }
    // Settings navigation (existing code)
    else if (inSettings) {
      if (digitalRead(ENC_DT) != state)
        settingsIndex = (settingsIndex + 1) % 6;
      else
        settingsIndex = (settingsIndex - 1 + 6) % 6;
      drawSettingsPage();
      beep();
    }
  }
  lastState = state;
}
```

## 7. Ensure UI Updates During Scanning

**The `MyAdvertisedDeviceCallbacks` class already has code to update the UI, but make sure this is in place:**

```cpp
class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveName()) {
      String deviceName = advertisedDevice.getName().c_str();
      if (deviceName.indexOf("OBD") >= 0 || deviceName.indexOf("obd") >= 0 ||
          deviceName.indexOf("ELM") >= 0 || deviceName.indexOf("KONNWEI") >= 0 ||
          deviceName.indexOf("Vgate") >= 0 || deviceName.indexOf("VEEPEAK") >= 0) {

        bool exists = false;
        for (const auto& dev : foundOBDDevices) {
          if (dev.address == advertisedDevice.getAddress().toString().c_str()) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          OBDDevice newDevice;
          newDevice.name = deviceName;
          newDevice.address = advertisedDevice.getAddress().toString().c_str();
          newDevice.rssi = advertisedDevice.getRSSI();
          newDevice.device = new BLEAdvertisedDevice(advertisedDevice);
          foundOBDDevices.push_back(newDevice);

          Serial.printf("Found OBD: %s (%s) RSSI: %d\n",
            deviceName.c_str(), newDevice.address.c_str(), newDevice.rssi);

          // *** IMPORTANT: Update UI immediately when on bluetooth page ***
          if (currentPage == PAGE_BLUETOOTH) {
            updateBluetoothPage();
          }
        }
      }
    }
  }
};
```

## 8. Update Loop to Handle Scan Timeout on Bluetooth Page

**In the `loop()` function, find where scanning timeout is handled and add:**

```cpp
if (isScanning && (now - scanStartTime > SCAN_DURATION)) {
  isScanning = false;
  obdState = foundOBDDevices.size() > 0 ? OBD_SELECTING : OBD_DISCONNECTED;
  if (currentPage == PAGE_CONNECT || currentPage == PAGE_BLUETOOTH) {  // <-- Add PAGE_BLUETOOTH here
    showPage();
  }
}
```

## Summary of Changes

1. ✅ Added `PAGE_BLUETOOTH` to page enum
2. ✅ Added `drawBluetoothPage()` and `updateBluetoothPage()` functions
3. ✅ Updated page navigation in `showPage()` and `updatePageData()`
4. ✅ Updated status bar titles array
5. ✅ Added Bluetooth page handling in button and scroll handlers
6. ✅ Ensured UI updates in real-time during scanning
7. ✅ Device selection with encoder scroll
8. ✅ Connect/disconnect with button press

## App Side Changes

The mobile app has been updated to:
- ✅ Accept all extended OBD2 fields (`obdCoolantTemp`, `obdThrottle`, `obdFuel`, `obdLoad`, `obdMAF`, `obdIntakeTemp`, `obdTiming`, `obdRuntime`)
- ✅ Parse and store all OBD2 data from Arduino's telemetry JSON
- ✅ Make OBD2 data available to all app screens

## Testing

After implementing these changes:

1. **Test Scanning:**
   - Navigate to Bluetooth page (click encoder button to cycle)
   - Click encoder to start scan
   - Watch devices appear in real-time
   - Scroll with encoder to select device

2. **Test Connection:**
   - Select a device with encoder
   - Short press encoder to connect
   - Watch connection status

3. **Test Data Flow:**
   - Check phone app receives all OBD2 data
   - Verify telemetry updates in real-time

4. **Test Logging:**
   - Ensure SD card logs include all OBD2 fields
   - Check app logs during recording session
