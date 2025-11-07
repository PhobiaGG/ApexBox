# Your RevenueCat Setup Guide - ApexBox Companion

## ✅ What You've Already Done

You've created:
- **Product Catalog** → **Products** → **Premium Access**
- **Product Identifier**: `premium_lifetime`
- **Type**: Non-Consumable (one-time purchase)

Perfect! Now let's complete the setup.

---

## 📋 Step 1: Configure Product Details

In RevenueCat Dashboard:

1. Go to **ApexBox** → **Product Catalog** → **Products** → **Premium Access**
2. Verify settings:
   - **Identifier**: `premium_lifetime` ✅
   - **Type**: Non-Consumable ✅
   - **Display Name**: "ApexBox Premium Access"
   - **Description**: "Lifetime access to premium features"

---

## 📋 Step 2: Create Entitlement

1. Go to **ApexBox** → **Entitlements**
2. Click **"+ New"**
3. Settings:
   - **Identifier**: `pro`
   - **Display Name**: "ApexBox Pro"
4. Click **Save**

---

## 📋 Step 3: Attach Product to Entitlement

1. Go back to **Product Catalog** → **Products** → **Premium Access**
2. Scroll to **"Entitlements"** section
3. Click **"+ Attach Entitlement"**
4. Select **"pro"**
5. Click **Save**

---

## 📋 Step 4: Create Offering

1. Go to **ApexBox** → **Offerings**
2. Click **"+ New Offering"**
3. Settings:
   - **Identifier**: `default`
   - **Description**: "Default offering for ApexBox Premium"
4. Click **Create**

---

## 📋 Step 5: Add Package to Offering

1. In the `default` offering, click **"+ Add Package"**
2. Settings:
   - **Identifier**: `lifetime`
   - **Product**: Select **"premium_lifetime"**
   - **Package Type**: Custom
3. Click **Save**

---

## 📋 Step 6: Set as Current Offering

1. In your `default` offering
2. Toggle **"Current Offering"** to **ON**
3. Click **Save**

---

## 📋 Step 7: Configure iOS (App Store Connect)

### 7.1 Create In-App Purchase in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select your app (or create new)
3. Go to **Features** → **In-App Purchases**
4. Click **"+"** to create new
5. Select **"Non-Consumable"**

**Configuration**:
- **Reference Name**: ApexBox Premium Lifetime
- **Product ID**: `premium_lifetime` ← **MUST MATCH**
- **Price**: $4.99 USD
- **Description**: Unlock Track Replay and Crew Leaderboards forever
- **Screenshot**: Upload a screenshot showing premium features

6. Click **Save**
7. Submit for review (required before testing)

### 7.2 Connect App Store Connect to RevenueCat

1. In RevenueCat Dashboard, go to **ApexBox** → **Apple App Store**
2. Click **"Configure"** or **"Edit"**
3. Enter:
   - **Bundle ID**: `com.apexbox.companion` (from your app.json)
   - **Shared Secret**: Get from App Store Connect → Users and Access → Shared Secret
   - **App-Specific Shared Secret**: (optional but recommended)

4. **Service Account Key** (Recommended):
   - In App Store Connect: Users and Access → Keys → App Store Connect API
   - Create new key with **"App Manager"** role
   - Download `.p8` file
   - Upload to RevenueCat
   - Enter **Issuer ID** and **Key ID** from App Store Connect

5. Click **Save**

---

## 📋 Step 8: Configure Android (Google Play Console)

### 8.1 Create In-App Product in Google Play

1. Go to https://play.google.com/console
2. Select your app (or create new)
3. Go to **Monetize** → **Products** → **In-app products**
4. Click **"Create product"**

**Configuration**:
- **Product ID**: `premium_lifetime` ← **MUST MATCH**
- **Name**: ApexBox Premium Lifetime
- **Description**: Unlock premium features including Track Replay and Crew Leaderboards forever
- **Default price**: $4.99 USD
- **Status**: Active

5. Click **Save** and **Activate**

### 8.2 Connect Google Play to RevenueCat

1. In RevenueCat Dashboard, go to **ApexBox** → **Google Play Store**
2. Click **"Configure"** or **"Edit"**
3. Enter:
   - **Package Name**: `com.apexbox.companion` (from your app.json)

4. **Service Account**:
   - Go to Google Cloud Console
   - Select your project (or create new linked to Play Console)
   - Enable **"Google Play Android Developer API"**
   - Create Service Account:
     - Name: "RevenueCat Service Account"
     - Role: "Owner" or "Service Account User"
   - Create JSON key
   - Download and upload to RevenueCat

5. Click **Save**

---

## 📋 Step 9: Get API Keys

1. In RevenueCat Dashboard, go to **API Keys**
2. Under **Public API Keys**, find:
   - **Apple App Store**: Copy key (starts with `appl_`)
   - **Google Play Store**: Copy key (starts with `goog_`)

---

## 📋 Step 10: Update Your App

Edit `/app/frontend/src/services/RevenueCatService.ts`:

```typescript
// Line 3-5: Replace with your actual keys
const REVENUECAT_APPLE_API_KEY = 'appl_xxxxxxxxxxxxx'; // Your Apple key
const REVENUECAT_GOOGLE_API_KEY = 'goog_xxxxxxxxxxxxx'; // Your Google key
```

**Important**: Product ID `premium_lifetime` is already configured ✅

---

## 📋 Step 11: Test Purchases

### iOS Testing (Sandbox)
1. On your iPhone, go to Settings → App Store
2. Sign out of your Apple ID
3. In App Store Connect, create a Sandbox Tester:
   - Users and Access → Sandbox Testers
   - Create new tester with unique email
4. Install your app (via TestFlight or development build)
5. Attempt purchase
6. Sign in with sandbox tester when prompted
7. Complete purchase (it's free in sandbox)

### Android Testing
1. In Google Play Console, go to Testing → License Testing
2. Add your Gmail to "License testers"
3. Create internal test track
4. Upload build and add yourself as tester
5. Install app from Play Store
6. Attempt purchase (will show as test purchase, free)

---

## 📋 Step 12: Verify in RevenueCat

After testing:
1. Go to RevenueCat Dashboard → **Customers**
2. Search for your test user
3. Should see:
   - Transaction recorded
   - Entitlement "pro" is active ✅
   - Product "premium_lifetime" purchased

---

## ✅ Verification Checklist

- [ ] Product `premium_lifetime` created in RevenueCat
- [ ] Entitlement `pro` created
- [ ] Product attached to entitlement
- [ ] Offering `default` created with package
- [ ] Current offering set
- [ ] iOS in-app purchase created (`premium_lifetime`)
- [ ] Android in-app product created (`premium_lifetime`)
- [ ] App Store Connect connected to RevenueCat
- [ ] Google Play connected to RevenueCat
- [ ] API keys copied to app code
- [ ] Tested on iOS sandbox
- [ ] Tested on Android testing track
- [ ] Premium features unlock after purchase

---

## 🔧 Troubleshooting

### "No products available"
- Wait 2-3 hours after creating App Store products (Apple delay)
- Verify product IDs match exactly: `premium_lifetime`
- Check RevenueCat logs for errors

### "Purchase failed"
- Verify API keys are correct (no spaces/typos)
- Check sandbox account is signed out of real App Store
- Ensure billing is set up in Play Console

### "Entitlement not granted"
- Verify product is attached to `pro` entitlement
- Check offering is set as current
- Look for errors in RevenueCat dashboard logs

---

## 📱 How It Works in Your App

1. User opens Premium screen
2. App fetches `default` offering from RevenueCat
3. Shows `premium_lifetime` product ($4.99)
4. User taps "Purchase"
5. Native payment sheet appears
6. User completes purchase
7. RevenueCat validates with Apple/Google
8. Entitlement `pro` is granted
9. App checks `profile.premium` → now `true`
10. Premium features unlock ✅

---

## 🔐 Security Notes

- RevenueCat handles all server-side validation
- Purchases are verified with Apple/Google servers
- Never trust client-side purchase status alone
- Always check `profile.premium` from Firebase

---

## 💰 Pricing & Payouts

- **Your Price**: $4.99 USD
- **Apple's Cut**: 30% (first year)
- **Your Revenue**: ~$3.49 per purchase
- **RevenueCat Fee**: Free up to $10k/month revenue
- **Payouts**: Monthly from Apple/Google

---

## 📞 Support

- **RevenueCat Docs**: https://docs.revenuecat.com
- **RevenueCat Community**: https://community.revenuecat.com
- **Email Support**: support@revenuecat.com

---

**Estimated Setup Time**: 45-60 minutes (mostly waiting for Apple approvals)

**Status**: Ready to accept real payments once API keys are added! 💳
