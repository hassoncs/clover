# IAP Setup Commands

## Prerequisites (Do These First in App Store Connect)

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Sign Paid Apps Agreement**:
   - Navigate to **Agreements, Tax, and Banking**
   - Sign the **Paid Apps Agreement**
   - Wait for status to show "Active"
3. **Configure Banking**:
   - Add bank account details
   - Complete tax information (W-9 or equivalent)
   - Wait for status to show "Ready for Sale"

**⏱️ Time Required**: 5-10 minutes (plus 24-48 hours for Apple processing)

---

## Commands to Run (After Prerequisites)

### Step 1: Update Fastlane (Optional but Recommended)

```bash
gem install fastlane
```

**Expected Output**:
```
Successfully installed fastlane-2.231.1
```

---

### Step 2: Verify Configuration

```bash
cd app/ios
cat fastlane/Appfile
```

**Should Show**:
```
app_identifier("me.ch5.slopcade.app")
apple_id("hassoncs@gmail.com")
team_id("73G23Y42T6")
```

---

### Step 3: Test Dry Run (No Auth)

```bash
cd app/ios
fastlane lanes
```

**Expected Output**:
```
--------- ios---------
----- fastlane ios sync_iaps
Sync IAP products to App Store Connect
```

---

### Step 4: Run the Real Sync (WITH Authentication)

**Option A: Using pnpm script (Recommended)**
```bash
pnpm ship:iaps
```

**Option B: Direct fastlane command**
```bash
cd app/ios
hush run -- fastlane sync_iaps
```

**Note:** Always use `hush run --` to inject Fastlane credentials from hush vault.

**What Will Happen**:
1. Fastlane will prompt for your Apple ID password
2. You'll need to complete 2FA (check your device)
3. Spaceship will authenticate with App Store Connect
4. For each of 7 products:
   - Check if exists → skip
   - If new → create with metadata + pricing + localizations
5. Success message when done

**Expected Duration**: 1-3 minutes

---

### Step 5: Verify in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select **Slopcade** app
3. Navigate to **In-App Purchases**
4. You should see 7 products:
   - ✅ `slopcade.gems.100` - $1.99
   - ✅ `slopcade.gems.300` - $4.99
   - ✅ `slopcade.gems.1500` - $19.99
   - ✅ `slopcade.sparks.50` - $0.99
   - ✅ `slopcade.sparks.200` - $2.99
   - ✅ `slopcade.sparks.1000` - $9.99
   - ✅ `slopcade.pro.monthly` - $9.99/mo (subscription)

---

## If Something Goes Wrong

### Error: "Paid Apps Agreement not signed"

**Solution**:
1. Go to https://appstoreconnect.apple.com
2. Complete prerequisites above
3. Wait 24-48 hours for Apple processing
4. Retry

---

### Error: "App not found"

**Solution**:
```bash
cd app/ios
fastlane produce
```

This creates the app record if it doesn't exist.

---

### Error: "Invalid credentials"

**Solution**:
1. Verify your Apple ID: `hassoncs@gmail.com`
2. Check 2FA is enabled on your Apple account
3. Try again (Spaceship will re-prompt)

---

### Error: "Product already exists"

**Not actually an error!** The script skips existing products automatically.

---

## Future Updates (Changing Prices)

### To Change a Price:

1. Edit `app/ios/fastlane/metadata/iaps.yml`
2. Update the `tier:` value (see tier mapping below)
3. Run `cd app/ios && fastlane sync_iaps`

**Price Tier Mapping**:
- Tier 1 = $0.99
- Tier 2 = $1.99
- Tier 3 = $2.99
- Tier 5 = $4.99
- Tier 10 = $9.99
- Tier 20 = $19.99

---

## Add to Deployment Script (Optional)

### Add to `package.json`:

```json
{
  "scripts": {
    "ship:iaps": "cd app/ios && fastlane sync_iaps"
  }
}
```

### Then run from root:

```bash
pnpm ship:iaps
```

---

## Summary

| Command | Purpose | Auth Required? |
|---------|---------|----------------|
| `fastlane lanes` | List available lanes | No |
| `fastlane sync_iaps` | Sync IAPs to App Store | Yes |
| `pnpm ship:iaps` | Same (from root) | Yes |

**Total Time**: ~5 minutes after prerequisites are complete.
