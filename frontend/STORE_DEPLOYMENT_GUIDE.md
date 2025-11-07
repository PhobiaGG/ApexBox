# 🚀 ApexBox Companion - Complete Store Deployment Guide

## Overview
This guide will walk you through deploying ApexBox Companion to both iOS App Store and Google Play Store using Expo Application Services (EAS).

---

## Prerequisites

### 1. Install Required Tools
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

### 2. Create Expo Account
1. Go to https://expo.dev/signup
2. Create a free account
3. Verify your email

### 3. Developer Accounts (Required for App Stores)

#### Apple Developer Account ($99/year)
- Sign up at: https://developer.apple.com/programs/
- Complete enrollment process (can take 24-48 hours)
- You'll need:
  - Apple ID
  - D-U-N-S Number (for organizations)
  - Credit card for annual fee

#### Google Play Developer Account ($25 one-time)
- Sign up at: https://play.google.com/console/signup
- Pay the one-time $25 registration fee
- Complete identity verification (can take 1-2 days)

---

## Step 1: Project Setup & Configuration

### 1.1 Login to Expo
```bash
cd /app/frontend
eas login
```
Enter your Expo credentials when prompted.

### 1.2 Configure EAS Project
```bash
eas build:configure
```
This will:
- Link your project to your Expo account
- Create/update `eas.json` configuration
- Set up build profiles

### 1.3 Update app.json (Critical!)
Open `/app/frontend/app.json` and update:

```json
{
  "expo": {
    "name": "ApexBox Companion",
    "slug": "apexbox-companion",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.apexbox.companion",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.apexbox.companion",
      "versionCode": 1
    }
  }
}
```

**Important:** Change `com.apexbox.companion` to your own unique bundle identifier!

---

## Step 2: Firebase Configuration

### 2.1 Download Firebase Config Files

#### For iOS:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings → Your apps
4. Under iOS app, download `GoogleService-Info.plist`
5. Place it in: `/app/frontend/GoogleService-Info.plist`

#### For Android:
1. In same Firebase Project Settings
2. Under Android app, download `google-services.json`
3. Place it in: `/app/frontend/google-services.json`

### 2.2 Add Firebase Plugins to app.json
Ensure these are in your `app.json`:
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth"
    ]
  }
}
```

---

## Step 3: Build for iOS

### 3.1 Configure iOS Credentials
```bash
# EAS will automatically handle certificates and provisioning profiles
eas credentials
```

Select:
- iOS → App Store & Ad Hoc
- Let EAS manage credentials (recommended)

### 3.2 Build iOS App
```bash
# Production build for App Store
eas build --platform ios --profile production
```

This will:
- Upload your code to Expo's servers
- Build the app in the cloud
- Generate an `.ipa` file
- Take approximately 15-30 minutes

### 3.3 Monitor Build Progress
- Check build status: `eas build:list`
- Or visit: https://expo.dev/accounts/[your-username]/projects/apexbox-companion/builds

### 3.4 Download the Build
Once complete, you'll get a download link. Save the `.ipa` file.

---

## Step 4: Build for Android

### 4.1 Build Android App
```bash
# Production build for Play Store
eas build --platform android --profile production
```

This generates an `.aab` (Android App Bundle) file optimized for Play Store.

**Alternative: Generate APK for testing**
```bash
eas build --platform android --profile preview
```

### 4.2 Download the Build
Save the `.aab` file when the build completes.

---

## Step 5: Submit to iOS App Store

### 5.1 Prepare App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Name:** ApexBox Companion
   - **Bundle ID:** com.apexbox.companion (or your custom one)
   - **SKU:** apexbox-companion-001
   - **Primary Language:** English

### 5.2 Upload App Binary

**Option A: Using EAS (Recommended)**
```bash
eas submit --platform ios
```
Select the build you just created.

**Option B: Manual Upload**
1. Download Transporter app from Mac App Store
2. Open Transporter
3. Drag and drop the `.ipa` file
4. Wait for upload to complete

### 5.3 Complete App Store Listing

In App Store Connect, fill out:

#### App Information
- **Name:** ApexBox Companion
- **Subtitle:** Real-time Vehicle Performance Tracker
- **Category:** Lifestyle
- **Secondary Category:** Sports

#### Pricing
- **Price:** Free
- **In-App Purchases:** Set up ApexBox Pro Pack ($9.99 or your price)

#### Privacy Policy & URLs
```
Privacy Policy: https://your-domain.com/privacy
Terms of Service: https://your-domain.com/terms
Support URL: https://your-domain.com/support
Marketing URL: https://your-domain.com
```

#### App Privacy
Answer questions about data collection:
- Location: YES (for GPS tracking)
- Contact Info: YES (email for account)
- User Content: YES (profile data)
- Usage Data: YES (analytics)
- Identifiers: YES (user account)

#### Description
```
ApexBox Companion is your ultimate performance tracking tool for automotive enthusiasts. Connect to your OBD-II device via Bluetooth and get real-time telemetry data including speed, G-force, temperature, and altitude.

KEY FEATURES:
✅ Real-time telemetry dashboard with live gauges
✅ GPS-based track replay with G-force visualization
✅ Session recording and analysis with detailed charts
✅ Global and crew-based leaderboards
✅ Performance data export and sharing
✅ Dark/Light theme support with custom accent colors

PREMIUM FEATURES (ApexBox Pro Pack):
🏆 Track replay with interactive GPS visualization
🏆 Crew leaderboards and competitions
🏆 Unlimited session storage

Perfect for track days, canyon runs, or monitoring your daily drive!
```

#### Keywords
```
performance, telemetry, OBD, racing, track, GPS, automotive, car, vehicle, speed, data
```

#### Screenshots (Required: 6.7" iPhone)
You need 3-8 screenshots sized 1290x2796px:
1. Dashboard with live telemetry
2. Track replay visualization
3. Session detail with charts
4. Leaderboards
5. Settings page
6. Session sharing

#### App Preview Video (Optional but recommended)
- 15-30 seconds showcasing key features

### 5.4 Submit for Review
1. Select your uploaded build
2. Add release notes
3. Set release method (Manual/Automatic)
4. Click "Submit for Review"

**Review Time:** Usually 1-3 days

---

## Step 6: Submit to Google Play Store

### 6.1 Create App in Play Console

1. Go to https://play.google.com/console/
2. Click "Create app"
3. Fill in:
   - **App name:** ApexBox Companion
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
4. Accept declarations and click "Create app"

### 6.2 Upload Android App Bundle

**Option A: Using EAS (Recommended)**
```bash
# First, configure submission
# Update eas.json with your service account key

eas submit --platform android
```

**Option B: Manual Upload**
1. In Play Console, go to "Production" (left sidebar)
2. Click "Create new release"
3. Upload the `.aab` file
4. Add release notes:
   ```
   Initial release of ApexBox Companion
   • Real-time telemetry tracking
   • GPS track replay
   • Session recording
   • Leaderboards and crew competitions
   ```
5. Click "Save" and "Review release"

### 6.3 Complete Store Listing

Navigate through the left sidebar sections:

#### Main Store Listing
- **App name:** ApexBox Companion
- **Short description:** (80 chars max)
  ```
  Track vehicle performance with real-time telemetry and GPS track replay.
  ```
- **Full description:**
  ```
  ApexBox Companion is your ultimate performance tracking tool for automotive enthusiasts. Connect to your OBD-II device via Bluetooth and get real-time telemetry data including speed, G-force, temperature, and altitude.

  KEY FEATURES:
  ✅ Real-time telemetry dashboard with live gauges
  ✅ GPS-based track replay with G-force visualization
  ✅ Session recording and analysis with detailed charts
  ✅ Global and crew-based leaderboards
  ✅ Performance data export and sharing
  ✅ Dark/Light theme support with custom accent colors

  PREMIUM FEATURES (ApexBox Pro Pack):
  🏆 Track replay with interactive GPS visualization
  🏆 Crew leaderboards and competitions
  🏆 Unlimited session storage
  🏆 Priority support

  Perfect for track days, canyon runs, or just monitoring your daily drive!

  REQUIREMENTS:
  • ELM327-compatible Bluetooth OBD-II adapter
  • Android device with GPS and Bluetooth
  • Vehicle with OBD-II port (most cars after 1996)
  ```

#### Graphics
**App Icon:** 512x512px PNG (no transparency)
**Feature Graphic:** 1024x500px JPG/PNG
**Phone Screenshots:** 2-8 screenshots (16:9 or 9:16 aspect ratio)
- Minimum 320px on short side
- Recommended: 1080x1920px

**Tablet Screenshots:** (Optional but recommended)
- 7-inch: 1200x1920px
- 10-inch: 1600x2560px

#### Categorization
- **App category:** Lifestyle
- **Tags:** Performance, Auto, Sports

#### Contact Details
```
Email: support@apexbox.com
Phone: (Optional)
Website: https://apexbox.com
Privacy Policy: https://apexbox.com/privacy
```

#### Privacy & Security
- Answer data safety questions
- Declare data collection practices
- Upload privacy policy

#### Content Rating
Complete the questionnaire:
- Violence: None
- Sexual content: None
- Language: Respectful
- Controlled substances: None
- Gambling: None
- Age rating: Everyone

#### App Content
- **Target audience:** 13+ or 18+
- **News app:** No
- **COVID-19 contact tracing:** No
- **Data safety:** Complete form
- **Government app:** No
- **Financial features:** No (unless IAP)

#### Store Settings
- **App availability:** All countries (or select specific ones)
- **Pricing:** Free with in-app purchases
- **Device categories:** Phone, Tablet

### 6.4 Submit for Review
1. Go back to "Production" release
2. Click "Review release"
3. Confirm everything looks good
4. Click "Start rollout to Production"

**Review Time:** Usually 3-7 days

---

## Step 7: Testing Builds Before Submission

### 7.1 Internal Testing (Recommended)

#### iOS - TestFlight
1. After building, submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```
2. In App Store Connect, go to TestFlight
3. Add internal testers (up to 100)
4. They'll get email invite to test via TestFlight app

#### Android - Internal Testing Track
1. In Play Console, go to "Internal testing"
2. Create release and upload `.aab`
3. Add testers by email
4. They'll get link to opt-in and download

### 7.2 Test Checklist Before Going Live
- [ ] App launches without crashes
- [ ] Authentication works (signup/login)
- [ ] Bluetooth scanning works (with real device)
- [ ] GPS tracking functions correctly
- [ ] Session recording saves properly
- [ ] Leaderboards load data
- [ ] Premium purchase flow works
- [ ] All screens render correctly
- [ ] No console errors or warnings
- [ ] Permissions are requested properly
- [ ] Dark and light themes work
- [ ] All three accent colors work

---

## Step 8: Post-Submission Monitoring

### 8.1 Track Review Status

#### iOS
- Check at: https://appstoreconnect.apple.com/
- Status updates: "Waiting for Review" → "In Review" → "Pending Developer Release" or "Ready for Sale"

#### Android
- Check at: https://play.google.com/console/
- Typically takes longer than iOS
- May receive feedback/questions from reviewers

### 8.2 Respond to Review Feedback
If rejected:
1. Read the rejection reason carefully
2. Fix the issues mentioned
3. Increment build number:
   - iOS: `buildNumber: "2"`
   - Android: `versionCode: 2`
4. Rebuild and resubmit

### 8.3 After Approval

#### iOS
- If set to manual release, click "Release This Version"
- App will appear in App Store within 24 hours

#### Android
- App goes live automatically (or as per release schedule)
- May take a few hours to appear in all regions

---

## Common Issues & Solutions

### Build Failures

**Issue: "Expo SDK version mismatch"**
```bash
# Solution: Update Expo SDK
cd /app/frontend
npm install expo@latest
npx expo install --fix
```

**Issue: "Pod install failed" (iOS)**
```bash
# Solution: Clear pod cache
cd ios
pod deintegrate
pod install
```

**Issue: "Gradle build failed" (Android)**
```bash
# Solution: Clear gradle cache
cd android
./gradlew clean
```

### Submission Failures

**iOS: "Missing compliance"**
- Add to app.json:
```json
{
  "expo": {
    "ios": {
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

**Android: "Target API level"**
- Ensure targetSdkVersion is 33+ (Android 13)
- Update in app.json build properties

### Runtime Issues

**Crash on Launch**
- Check Firebase configuration is correct
- Verify all required permissions in app.json
- Test with development build first

**Permissions Not Working**
- Ensure descriptions in app.json are clear
- Test permission flow on physical device

---

## Updating Your App (Future Releases)

### Version Management

1. **Update version numbers in app.json:**
```json
{
  "expo": {
    "version": "1.0.1",  // Increment (semantic versioning)
    "ios": {
      "buildNumber": "2"  // Always increment
    },
    "android": {
      "versionCode": 2    // Always increment
    }
  }
}
```

2. **Build new version:**
```bash
eas build --platform all --profile production
```

3. **Submit updates:**
```bash
eas submit --platform ios
eas submit --platform android
```

### Release Notes Template
```
Version 1.0.1 - Bug Fixes & Improvements

What's New:
• Fixed crash when opening session logs
• Improved crew page auto-refresh
• Added delete logs feature
• Better state filtering in leaderboards
• Performance improvements

Bug Fixes:
• Fixed "invalid number formatting" error
• Fixed track replay infinite loop
• Resolved chart display issues
```

---

## Helpful Resources

### Official Documentation
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **App Store Connect:** https://developer.apple.com/app-store-connect/
- **Play Console:** https://support.google.com/googleplay/android-developer/

### Community & Support
- **Expo Forums:** https://forums.expo.dev/
- **Expo Discord:** https://chat.expo.dev/
- **Stack Overflow:** Tag with `expo` or `react-native`

### Tools
- **App Icon Generator:** https://www.appicon.co/
- **Screenshot Tools:** https://www.screely.com/
- **ASO Tools:** https://www.appannie.com/

---

## Cost Summary

### One-Time Costs
- Apple Developer Program: $99/year
- Google Play Developer: $25 (one-time)

### Monthly Costs (Optional)
- EAS Build: Free tier includes limited builds
  - Paid plans: $29-$99/month for unlimited builds
- Firebase: Free tier should be sufficient initially
- RevenueCat: Free up to $2,500 MRR

### Total Initial Investment
- **Minimum:** $124 (Apple + Google)
- **With EAS Build:** $124 + $29/month (optional)

---

## 🎉 Congratulations!

You've successfully deployed ApexBox Companion to both app stores!

Next steps:
1. ✅ Monitor reviews and ratings
2. ✅ Track analytics and user behavior
3. ✅ Plan updates based on user feedback
4. ✅ Market your app (social media, website, etc.)
5. ✅ Engage with your user community

Good luck with your app launch! 🚀
