# 🚀 Quick Start: Deploy ApexBox Companion

## Prerequisites Checklist
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com/programs/
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console/
- [ ] Expo Account (Free) - https://expo.dev/signup

---

## 5-Minute Setup

### Step 1: Install EAS CLI (One-time)
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
cd /app/frontend
eas login
```

### Step 3: Initialize EAS Build
```bash
eas build:configure
```
Select your project or create a new one when prompted.

### Step 4: Update Your Bundle Identifiers
Edit `/app/frontend/app.json` and change:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.apexbox"  // Change this!
    },
    "android": {
      "package": "com.yourcompany.apexbox"  // Change this!
    }
  }
}
```

---

## Build Commands

### Option 1: Build Both Platforms (Recommended)
```bash
cd /app/frontend
eas build --platform all --profile production
```

### Option 2: Build iOS Only
```bash
cd /app/frontend
eas build --platform ios --profile production
```

### Option 3: Build Android Only
```bash
cd /app/frontend
eas build --platform android --profile production
```

### Option 4: Build Preview APK (For Testing)
```bash
cd /app/frontend
eas build --platform android --profile preview
```

**Build Time:** 15-30 minutes per platform

---

## Monitor Build Progress

### Check Build Status
```bash
eas build:list
```

### View Online
Go to: https://expo.dev/accounts/[your-username]/projects/apexbox-companion/builds

---

## Submit to Stores

### iOS App Store
```bash
cd /app/frontend
eas submit --platform ios
```
Follow the prompts to select your build.

### Google Play Store
```bash
cd /app/frontend
eas submit --platform android
```
Follow the prompts to select your build.

---

## What Happens During Build?

### iOS Build Process:
1. ✅ Uploads your code to Expo servers
2. ✅ Automatically generates certificates & provisioning profiles
3. ✅ Compiles native iOS app
4. ✅ Creates `.ipa` file
5. ✅ Provides download link

### Android Build Process:
1. ✅ Uploads your code to Expo servers
2. ✅ Automatically generates signing keys
3. ✅ Compiles native Android app
4. ✅ Creates `.aab` file (App Bundle)
5. ✅ Provides download link

---

## After Successful Build

### iOS - Complete App Store Connect Listing
1. Go to https://appstoreconnect.apple.com/
2. Create new app (if not done)
3. Upload your build via `eas submit --platform ios`
4. Fill out app information:
   - Screenshots (1290x2796px for iPhone)
   - Description
   - Keywords
   - Privacy policy URL
   - Screenshots
5. Submit for review

### Android - Complete Play Console Listing
1. Go to https://play.google.com/console/
2. Create new app (if not done)
3. Upload your build via `eas submit --platform android`
4. Fill out store listing:
   - Screenshots (1080x1920px minimum)
   - Feature graphic (1024x500px)
   - Description
   - Privacy policy URL
5. Submit for review

---

## Common First-Time Issues

### Issue: "Not configured for EAS"
**Solution:**
```bash
eas build:configure
```

### Issue: "Invalid bundle identifier"
**Solution:** Make sure your bundle ID is unique and follows format: `com.yourcompany.appname`

### Issue: "Missing credentials"
**Solution:** Let EAS manage credentials automatically (recommended for beginners)

### Issue: "Build failed - Firebase"
**Solution:** Ensure Firebase config files are present:
- iOS: `GoogleService-Info.plist` in project root
- Android: `google-services.json` in project root

---

## Build Cost

### Free Tier (Expo)
- iOS: 30 builds/month
- Android: 30 builds/month

### Paid Plans (Optional)
- **Production Plan:** $29/month - Unlimited builds
- **Enterprise Plan:** $99/month - Priority builds + support

For getting started, the free tier is sufficient!

---

## Testing Your Build

### iOS - TestFlight (Internal Testing)
```bash
eas submit --platform ios
```
Then in App Store Connect:
1. Go to TestFlight tab
2. Add internal testers
3. They'll receive email invite

### Android - Internal Testing Track
1. In Play Console, create "Internal testing" release
2. Add testers by email
3. Share the opt-in link

---

## Success Indicators

You'll know everything worked when you see:
- ✅ Build completes with "SUCCESS" status
- ✅ Download link provided for `.ipa` or `.aab`
- ✅ No errors in build logs
- ✅ File size is reasonable (50-200MB typically)

---

## Next Steps After This Guide

1. **Build your apps** (15-30 min each)
2. **Test on physical devices** via TestFlight/Internal Testing
3. **Complete store listings** (screenshots, descriptions)
4. **Submit for review** (1-7 days review time)
5. **Monitor reviews** and iterate!

---

## Need Help?

### Expo Resources
- Docs: https://docs.expo.dev/
- Forums: https://forums.expo.dev/
- Discord: https://chat.expo.dev/

### ApexBox App Issues
- Check `/app/frontend/STORE_DEPLOYMENT_GUIDE.md` for detailed guide
- Review `/app/frontend/APP_STORE_GUIDE.md` for asset requirements

---

## 🎉 Ready to Deploy!

Your app is configured and ready. Just run:
```bash
cd /app/frontend
eas build --platform all --profile production
```

Then grab a coffee ☕ and wait 20-30 minutes for your builds to complete!

Good luck! 🚀
