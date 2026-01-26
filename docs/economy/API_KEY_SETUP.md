# App Store Connect API Key Setup

## What You Need

1. **Key ID**: `LKWZUUJLMH` ✅ (Already set in hush)
2. **Issuer ID**: Get from App Store Connect
3. **Key File**: `AuthKey_LKWZUUJLMH.p8` ✅ (Already in `app/ios/fastlane/`)

---

## Step 1: Get Your Issuer ID

1. Go to https://appstoreconnect.apple.com/access/api
2. Look at the top of the page
3. Copy the **Issuer ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

## Step 2: Store Issuer ID in Hush

```bash
hush set ASC_ISSUER_ID "YOUR_ISSUER_ID_HERE"
```

Replace `YOUR_ISSUER_ID_HERE` with the actual ID from Step 1.

---

## Step 3: Verify Configuration

```bash
hush list | grep ASC
```

**Should show:**
```
ASC_KEY_ID=LKWZUUJLMH
ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Step 4: Test IAP Sync

```bash
pnpm ship:iaps
```

**Expected Output:**
```
🔄 Syncing IAP products to App Store Connect...
✅ Loaded 7 products from config
🔐 Using App Store Connect API Key for authentication...
📱 Found app: Slopcade
```

---

## Files Configured

| File | Status | Notes |
|------|--------|-------|
| `app/ios/fastlane/AuthKey_LKWZUUJLMH.p8` | ✅ | API key file (git-ignored) |
| `app/ios/fastlane/Appfile` | ✅ | Auto-uses API key if env vars present |
| `app/ios/fastlane/Fastfile` | ✅ | Removed manual login, uses API key |
| `hush.yaml` | ✅ | Fastlane target includes ASC_* vars |
| `package.json` | ✅ | `pnpm ship:iaps` command added |

---

## Troubleshooting

### "Key file not found"
```bash
ls -la app/ios/fastlane/AuthKey_*.p8
```
Should show `AuthKey_LKWZUUJLMH.p8`.

### "Issuer ID not set"
```bash
hush list | grep ASC_ISSUER_ID
```
If empty, repeat Step 2.

### "API key invalid"
Verify the key is **App Manager** role in App Store Connect.

---

## Security Notes

- ✅ API key file is git-ignored (`.gitignore`)
- ✅ Secrets stored in hush vault (encrypted)
- ✅ No passwords needed (more secure than app-specific passwords)
- ✅ Works in CI/CD (no 2FA prompts)
