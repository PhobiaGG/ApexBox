# ApexBox Companion - App Store Submission Guide

## 📱 App Overview
**Name:** ApexBox Companion  
**Version:** 1.0.0  
**Bundle ID (iOS):** com.apexbox.companion  
**Package (Android):** com.apexbox.companion  

## 🎯 App Description

### Short Description (80 characters)
Track vehicle performance with real-time telemetry and GPS track replay.

### Full Description
ApexBox Companion is your ultimate performance tracking tool for automotive enthusiasts. Connect to your OBD-II device via Bluetooth and get real-time telemetry data including speed, G-force, temperature, and altitude.

**Key Features:**
✅ Real-time telemetry dashboard with live gauges
✅ GPS-based track replay with G-force visualization
✅ Session recording and analysis with detailed charts
✅ Global and crew-based leaderboards
✅ Performance data export and sharing
✅ Dark/Light theme support with custom accent colors
✅ Cloud sync across devices

**Premium Features (ApexBox Pro Pack):**
🏆 Track replay with interactive GPS visualization
🏆 Crew leaderboards and competitions
🏆 Unlimited session storage
🏆 Priority support

Perfect for track days, canyon runs, or just monitoring your daily drive!

### Keywords
performance, telemetry, OBD-II, racing, track day, GPS, automotive, car, vehicle, speed, data logger

## 🖼️ Required Assets

### App Icons
- **iOS:** 1024x1024px PNG (no transparency, no rounded corners)
- **Android:** 512x512px PNG (no transparency)
- Location: `/app/frontend/assets/images/icon.png`

### Screenshots (5-8 required for each platform)

#### iPhone (6.7" Display - iPhone 14 Pro Max)
- Resolution: 1290x2796px
- Recommended screenshots:
  1. Dashboard with live telemetry
  2. Track replay visualization
  3. Session detail with charts
  4. Leaderboards (crews and global)
  5. Settings and customization
  6. Session sharing feature

#### Android (Phone)
- Resolution: 1080x1920px or higher
- Same content as iOS

### Feature Graphic (Android only)
- Resolution: 1024x500px
- Eye-catching banner for Play Store listing

### Preview Video (Optional but recommended)
- Duration: 15-30 seconds
- Show key features in action
- Add captions (no audio required)

## 📝 App Store Metadata

### Categories
- **Primary:** Lifestyle
- **Secondary:** Sports / Utilities

### Age Rating
- **iOS:** 4+ (No Objectionable Content)
- **Android:** Everyone

### Content Rating Questionnaire (Android)
- Violence: No
- Sexual Content: No
- Language: No
- Controlled Substances: No
- Gambling: No
- Discrimination: No

### Privacy Policy
- URL: `https://yourdomain.com/privacy` (Update after deployment)
- Location: `/app/frontend/PRIVACY_POLICY.md`

### Terms of Service
- URL: `https://yourdomain.com/terms` (Update after deployment)
- Location: `/app/frontend/TERMS_OF_SERVICE.md`

### EULA
- Location: `/app/frontend/EULA.md`

## 🔐 Required Permissions & Justifications

### iOS (Info.plist)
```
NSLocationWhenInUseUsageDescription: "ApexBox tracks your location during performance sessions to create track replays and analyze your driving data."

NSBluetoothAlwaysUsageDescription: "ApexBox uses Bluetooth to connect to your OBD-II performance tracker device for real-time telemetry."

NSCameraUsageDescription: "ApexBox needs camera access to take profile pictures for your account."

NSPhotoLibraryUsageDescription: "ApexBox needs photo access to set your profile picture and save session screenshots."
```

### Android (AndroidManifest.xml)
- `ACCESS_FINE_LOCATION` - GPS tracking for sessions
- `ACCESS_BACKGROUND_LOCATION` - Continue tracking during sessions
- `BLUETOOTH` / `BLUETOOTH_CONNECT` / `BLUETOOTH_SCAN` - OBD-II device connection
- `CAMERA` - Profile picture capture
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` - Session data storage

## 🚀 Build Instructions

### Development Build (Expo Go Compatible)
```bash
cd /app/frontend
yarn install
expo start
```
Scan QR code with Expo Go app for testing.

### Production Build

#### iOS
```bash
# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Android
```bash
# Build for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### Local Builds (Alternative)

#### iOS (macOS only with Xcode)
```bash
expo prebuild --platform ios
cd ios
pod install
xcodebuild -workspace ApexBoxCompanion.xcworkspace -scheme ApexBoxCompanion archive
```

#### Android
```bash
expo prebuild --platform android
cd android
./gradlew assembleRelease
```

## 🔑 Required Credentials

### Firebase (Already configured)
- iOS: GoogleService-Info.plist
- Android: google-services.json

### RevenueCat (For IAP)
- **iOS:** App-specific shared secret from App Store Connect
- **Android:** Service Account JSON from Google Play Console
- Update in RevenueCat dashboard after app submission

### Apple Developer Account
- Team ID
- App Store Connect API Key
- Provisioning Profiles

### Google Play Developer Account
- Service Account JSON for API access
- App signing key

## ⚠️ Pre-Submission Checklist

### Testing
- [ ] Test on physical iOS device (iPhone 12+)
- [ ] Test on physical Android device (Android 10+)
- [ ] Test Bluetooth OBD-II connection
- [ ] Test GPS tracking and track replay
- [ ] Test session recording and playback
- [ ] Test authentication flow (signup/login)
- [ ] Test premium purchase flow
- [ ] Test leaderboard functionality
- [ ] Test in both light and dark modes
- [ ] Test all three accent colors (Cyan, Magenta, Lime)
- [ ] Test offline functionality
- [ ] Verify error handling and edge cases

### Compliance
- [ ] Privacy policy hosted and accessible
- [ ] Terms of service hosted and accessible
- [ ] EULA included
- [ ] All permission requests justified
- [ ] App follows platform guidelines (iOS HIG, Material Design)
- [ ] No crashes or major bugs
- [ ] Performance is smooth (60fps animations)

### Content
- [ ] All screenshots captured
- [ ] Feature graphic designed (Android)
- [ ] App icons finalized (1024x1024 iOS, 512x512 Android)
- [ ] Description proofread
- [ ] Keywords optimized
- [ ] Support email configured
- [ ] Website URL updated (if available)

### Technical
- [ ] Version number updated
- [ ] Build number incremented
- [ ] Release notes written
- [ ] Crash reporting configured
- [ ] Analytics configured (optional)
- [ ] Deep linking tested
- [ ] Push notifications configured (if applicable)

## 📞 Support Information
- **Support Email:** support@apexbox.com (Update this)
- **Support URL:** https://apexbox.com/support (Update this)
- **Marketing URL:** https://apexbox.com (Update this)

## 🔄 Update Process

### Version Bumping
1. Update version in `app.json`:
   - `version`: "1.0.1" (semantic versioning)
   - iOS `buildNumber`: "2"
   - Android `versionCode`: 2

2. Update release notes

3. Rebuild and resubmit

### Release Notes Template
```
Version 1.0.0
• Initial release
• Real-time telemetry dashboard
• GPS track replay
• Session recording and analysis
• Global and crew leaderboards
• Performance data sharing
• Dark/Light theme support
```

## 📊 Post-Launch Monitoring

### Metrics to Track
- Downloads and installs
- Daily/Monthly active users
- Session duration
- Crash rate (should be < 1%)
- Rating and reviews
- Premium conversion rate
- Feature usage analytics

### Tools
- App Store Connect (iOS)
- Google Play Console (Android)
- Firebase Analytics
- RevenueCat dashboard (for IAP)

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Expo Go Testing:** BLE functionality requires development build (falls back to mock mode in Expo Go)
2. **Background Location:** May require additional testing for long sessions
3. **OBD-II Compatibility:** Requires ELM327-compatible Bluetooth OBD-II adapter

### Planned Improvements (v1.1)
- Apple Watch companion app
- Widget support for iOS
- Android Auto integration
- Cloud backup for sessions
- Social features and comments
- Video recording integration

## 📄 Legal Documents

All legal documents are included in the project:
- `/app/frontend/PRIVACY_POLICY.md`
- `/app/frontend/TERMS_OF_SERVICE.md`
- `/app/frontend/EULA.md`

**Important:** Host these on a public website and update URLs in app.json before submission.

## ✅ Ready for Submission

Once all checklist items are complete:
1. Archive your builds
2. Upload to App Store Connect (iOS) and Play Console (Android)
3. Fill out all metadata forms
4. Upload screenshots and assets
5. Submit for review

**Average Review Time:**
- iOS: 1-3 days
- Android: 3-7 days

Good luck with your submission! 🚀
