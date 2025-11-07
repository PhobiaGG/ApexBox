# ApexBox Companion - Deployment Guide

## 🚀 Quick Start

This app is ready for both **Expo Go testing** and **App Store deployment**.

### Testing with Expo Go (No Build Required)

1. **Install Expo Go** on your mobile device:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Get your QR Code:**
   - The app is already running at the tunnel URL
   - Check the console logs for the QR code
   - Or visit the Expo dashboard

3. **Scan & Test:**
   - Open Expo Go app
   - Scan the QR code
   - App will load instantly!

**Note:** BLE functionality uses mock mode in Expo Go. For real BLE testing, create a development build.

## 📦 Building for App Stores

### Prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure project (first time only)
eas build:configure
```

### iOS Build

#### Development Build (for testing on device)
```bash
cd /app/frontend
eas build --platform ios --profile development
```

#### App Store Build
```bash
# Production build
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --latest
```

**Required for iOS:**
- Apple Developer Account ($99/year)
- App Store Connect access
- Bundle Identifier: `com.apexbox.companion`

### Android Build

#### Development Build (APK for testing)
```bash
cd /app/frontend
eas build --platform android --profile preview
```

#### Play Store Build
```bash
# Production build (AAB)
eas build --platform android --profile production

# Submit to Google Play Console
eas submit --platform android --latest
```

**Required for Android:**
- Google Play Developer Account ($25 one-time)
- Package name: `com.apexbox.companion`

## 🔧 Build Configuration

All build settings are in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## 📱 Development Builds vs Expo Go

### Expo Go (Recommended for rapid testing)
✅ No build required  
✅ Instant updates  
✅ Perfect for UI/UX testing  
❌ Limited native modules (BLE uses mock)  
❌ Can't test push notifications  

### Development Build (For full feature testing)
✅ Full native module support  
✅ Real BLE connection  
✅ Push notifications  
✅ Custom native code  
❌ Requires rebuild for changes  
❌ Longer testing cycle  

### Production Build (For app stores)
✅ Optimized and minified  
✅ App Store ready  
✅ OTA updates supported  
❌ Requires app store approval  
❌ Can't use Expo Go  

## 🔄 Update Strategy

### Over-The-Air (OTA) Updates

After initial app store submission, you can push updates instantly:

```bash
# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

**OTA updates work for:**
- JavaScript/TypeScript code changes
- Asset updates
- Most React Native changes

**Requires new build for:**
- Native module changes
- iOS/Android configuration changes
- Permission changes
- New dependencies with native code

## 🧪 Testing Checklist

Before building for production:

### Functional Testing
- [ ] Login/Signup flow
- [ ] Dashboard with live telemetry (mock mode)
- [ ] Session recording
- [ ] Session playback and charts
- [ ] Track replay visualization
- [ ] GPS tracking (requires device build)
- [ ] BLE connection (requires device build)
- [ ] Leaderboards (global and crews)
- [ ] Profile management
- [ ] Car garage management
- [ ] Settings and preferences
- [ ] Theme switching (dark/light/accents)
- [ ] Premium purchase flow
- [ ] Session sharing

### Platform-Specific
- [ ] iOS: App Store Connect screenshots
- [ ] iOS: All permissions justified
- [ ] Android: Play Store assets
- [ ] Android: Content rating completed
- [ ] Both: Privacy policy accessible
- [ ] Both: Terms of service accessible

### Performance
- [ ] App launches in < 3 seconds
- [ ] No memory leaks during long sessions
- [ ] Smooth 60fps animations
- [ ] GPS tracking doesn't drain battery excessively
- [ ] Offline functionality works

## 🐛 Troubleshooting

### Build Failures

**iOS: "No provisioning profile found"**
```bash
# Let EAS handle it automatically
eas build --platform ios --profile production --auto-submit
```

**Android: "Gradle build failed"**
```bash
# Clear cache and retry
eas build --platform android --profile production --clear-cache
```

### Runtime Issues

**Error: "Text strings must be rendered within a <Text> component"**
- ✅ Fixed! All text is properly wrapped

**BLE not working in Expo Go**
- Expected behavior - use development build for real BLE

**GPS tracking not starting**
- Check location permissions
- Ensure user granted "While Using App" permission

## 📊 Monitoring & Analytics

### Crash Reporting
Already integrated with error boundary. Consider adding:
- Sentry: `npx expo install sentry-expo`
- Firebase Crashlytics

### Analytics
- Firebase Analytics (recommended)
- Amplitude
- Mixpanel

### Performance Monitoring
- Firebase Performance Monitoring
- React Native Performance

## 🔐 Environment Variables

### Production Setup

Create `.env.production`:
```env
EXPO_PUBLIC_BACKEND_URL=https://api.apexbox.com
FIREBASE_API_KEY=your_production_key
REVENUECAT_API_KEY=your_production_key
```

### Development Setup
Current `.env` is configured for development/Expo Go.

## 📝 Pre-Submission Checklist

### Code Quality
- [x] All TypeScript errors resolved
- [x] ESLint passing
- [x] No console warnings in production
- [x] Error boundaries in place
- [x] All text wrapped in <Text> components
- [x] Conditional rendering uses ternary operators

### App Store Requirements
- [ ] Screenshots prepared (5-8 per platform)
- [ ] App icon finalized (1024x1024)
- [ ] Description written and proofread
- [ ] Keywords optimized
- [ ] Privacy policy URL updated
- [ ] Support email configured
- [ ] Age rating set correctly

### Legal
- [ ] Privacy policy reviewed
- [ ] Terms of service reviewed
- [ ] EULA included
- [ ] All third-party licenses acknowledged

## 🚢 Release Process

1. **Update Version**
   ```json
   // In app.json
   "version": "1.0.1",
   "ios": { "buildNumber": "2" },
   "android": { "versionCode": 2 }
   ```

2. **Build**
   ```bash
   eas build --platform all --profile production
   ```

3. **Test Build**
   - Download from EAS dashboard
   - Install on physical devices
   - Complete full testing cycle

4. **Submit**
   ```bash
   eas submit --platform all --latest
   ```

5. **Monitor**
   - Check App Store Connect / Play Console
   - Watch for review feedback
   - Monitor crash reports

## 🎉 Post-Launch

### Marketing
- Create landing page
- Set up social media
- Prepare press kit
- Reach out to automotive communities

### Growth
- Monitor user feedback
- Track key metrics
- Plan feature updates
- Engage with users

### Support
- Monitor support email
- Respond to reviews
- Update FAQs
- Create tutorial videos

## 📞 Need Help?

- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **React Native:** https://reactnative.dev/

---

**Your app is ready to ship! 🚀**

Good luck with your launch!
