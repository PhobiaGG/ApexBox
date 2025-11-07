# RevenueCat Setup Guide for ApexBox Companion

## 📋 Overview
This guide will help you set up real in-app purchases using RevenueCat for the ApexBox Pro Pack ($4.99 one-time purchase).

---

## Step 1: Create RevenueCat Account

1. Go to https://app.revenuecat.com/signup
2. Create a free account
3. Create a new project: "ApexBox Companion"

---

## Step 2: Configure iOS App

### 2.1 App Store Connect Setup
1. Log in to https://appstoreconnect.apple.com
2. Go to "My Apps" → Select your app (or create new)
3. Navigate to "Features" → "In-App Purchases"
4. Click "+ Create" → Select "Non-Consumable"

**Product Configuration:**
- **Reference Name**: ApexBox Pro Pack
- **Product ID**: `apexbox_pro_pack`
- **Price**: $4.99 (USD)
- **Description**: Unlock Track Map Replay and Crew Leaderboards
- **Screenshot**: (upload a screenshot of premium features)

5. Save and submit for review

### 2.2 RevenueCat iOS Configuration
1. In RevenueCat dashboard, click "Apps" → "Add new app"
2. Select "iOS"
3. **Bundle ID**: `com.apexbox.companion` (from app.json)
4. **Apple Store Connect Private Key**:
   - Go to App Store Connect → Users and Access → Keys
   - Generate new key with "App Manager" role
   - Download `.p8` file
   - Upload to RevenueCat
5. **Issuer ID** and **Key ID**: Copy from App Store Connect
6. Save configuration

---

## Step 3: Configure Android App

### 3.1 Google Play Console Setup
1. Log in to https://play.google.com/console
2. Select your app (or create new)
3. Go to "Monetize" → "Products" → "In-app products"
4. Click "Create product"

**Product Configuration:**
- **Product ID**: `apexbox_pro_pack`
- **Name**: ApexBox Pro Pack
- **Description**: Unlock premium features including Track Map Replay and Crew Leaderboards
- **Price**: $4.99
- **Status**: Active

5. Save

### 3.2 RevenueCat Android Configuration
1. In RevenueCat dashboard, click "Apps" → "Add new app"
2. Select "Android"
3. **Package Name**: `com.apexbox.companion` (from app.json)
4. **Service Account JSON**:
   - Go to Google Cloud Console
   - Enable Google Play Developer API
   - Create service account with "Owner" role
   - Download JSON key file
   - Upload to RevenueCat
5. Save configuration

---

## Step 4: Create Entitlements in RevenueCat

1. In RevenueCat dashboard, go to "Entitlements"
2. Click "Add entitlement"
3. **Identifier**: `pro`
4. **Display Name**: ApexBox Pro
5. Save

---

## Step 5: Create Products in RevenueCat

1. Go to "Products" → "Add product"
2. **Identifier**: `apexbox_pro_pack`
3. **Type**: One-time purchase
4. **Store Product IDs**:
   - iOS: `apexbox_pro_pack`
   - Android: `apexbox_pro_pack`
5. **Attach to Entitlement**: Select "pro"
6. Save

---

## Step 6: Create Offering

1. Go to "Offerings" → "Add offering"
2. **Identifier**: `default`
3. **Description**: Default offering for ApexBox Pro
4. **Packages**:
   - Click "Add package"
   - **Identifier**: `pro_pack`
   - **Product**: Select `apexbox_pro_pack`
   - **Package Type**: One-time
5. Set as current offering
6. Save

---

## Step 7: Get API Keys

1. In RevenueCat dashboard, go to "API Keys"
2. Find your **Public API Keys**:
   - **Apple App Store**: Copy the key (starts with `appl_`)
   - **Google Play Store**: Copy the key (starts with `goog_`)

---

## Step 8: Update App Configuration

### 8.1 Update RevenueCat Service

Edit `/app/frontend/src/services/RevenueCatService.ts`:

```typescript
// Replace these with your actual keys
const REVENUECAT_APPLE_API_KEY = 'appl_YOUR_ACTUAL_KEY_HERE';
const REVENUECAT_GOOGLE_API_KEY = 'goog_YOUR_ACTUAL_KEY_HERE';
```

### 8.2 Update app.json

Ensure your bundle IDs match:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.apexbox.companion"
    },
    "android": {
      "package": "com.apexbox.companion"
    }
  }
}
```

---

## Step 9: Test Purchases

### 9.1 iOS Sandbox Testing
1. On your iOS device, sign out of App Store
2. Go to Settings → App Store → Sandbox Account
3. Create a sandbox tester account in App Store Connect
4. In your app, attempt a purchase
5. Sign in with sandbox account when prompted
6. Complete the purchase (it's free in sandbox)

### 9.2 Android Testing
1. In Google Play Console, add your email to "License Testing"
2. Install your app via internal testing track
3. Attempt a purchase
4. Complete purchase (will show as test purchase)

---

## Step 10: Verify Integration

### In RevenueCat Dashboard:
1. Go to "Customers"
2. You should see test purchases appear
3. Check that entitlement "pro" is granted

### In Your App:
1. After purchase, `profile.premium` should be `true`
2. Track Replay should be unlocked
3. Crew Leaderboards should be accessible

---

## 🔧 Troubleshooting

### "No products available"
- Verify product IDs match exactly in all systems
- Wait 2-3 hours after creating products (App Store delay)
- Check RevenueCat logs for errors

### "Purchase failed"
- Verify API keys are correct
- Check sandbox account is configured
- Ensure billing agreement is active (Google Play)

### "Entitlement not granted"
- Verify product is attached to entitlement
- Check offering is set as current
- Test with RevenueCat's "Test Transactions" tool

---

## 📊 Production Checklist

Before releasing to production:

- [ ] iOS in-app purchase approved by Apple
- [ ] Android in-app product active in Play Console
- [ ] RevenueCat API keys added to app
- [ ] Tested purchase flow on real devices
- [ ] Verified entitlement grants correctly
- [ ] Restore purchases works correctly
- [ ] Tested on both iOS and Android
- [ ] Privacy policy mentions in-app purchases
- [ ] Terms of service updated

---

## 🔐 Security Notes

1. **Never commit API keys to git**
   - Use environment variables in production
   - Keep keys in `.env` files (gitignored)

2. **Server-side validation**
   - RevenueCat handles this automatically
   - Purchases are validated with Apple/Google servers

3. **Entitlement checking**
   - Always check `profile.premium` status
   - Never trust client-side purchase state alone

---

## 📞 Support

- **RevenueCat Docs**: https://docs.revenuecat.com
- **RevenueCat Support**: support@revenuecat.com
- **Community**: https://community.revenuecat.com

---

## ✅ Post-Setup

After completing setup:

1. Update `/app/CRITICAL_FIXES_SUMMARY.md` with your API keys location
2. Test thoroughly in sandbox before production
3. Monitor RevenueCat dashboard for purchase analytics
4. Set up webhooks for advanced features (optional)

---

**Estimated Setup Time**: 2-3 hours (mostly waiting for App Store/Play Store approvals)

**Status After Setup**: 
- Mock purchases → Real purchases ✅
- Premium feature gating → Actual payment required ✅
- Revenue tracking → RevenueCat analytics ✅
