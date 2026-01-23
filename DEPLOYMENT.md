# Slopcade Deployment Guide

You can now deploy Slopcade using a single command from the root directory:

```bash
pnpm ship
```

## Available Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `pnpm ship native` | **Native Changes** | Builds a new binary via EAS and submits to TestFlight. |
| `pnpm ship update` | **JS/Web Changes** | Pushes a JS-only update via EAS Update (instant). |
| `pnpm ship metadata`| **Metadata** | Syncs App Store descriptions/screenshots via Fastlane. |
| `pnpm ship web` | **Web App** | Deploys the web version to Cloudflare Pages. |

---

## ⚠️ Required Manual Steps

Before your first deployment, you MUST complete these steps:

### 1. Expo Authentication
Log in to your Expo account on your machine:
```bash
npx eas login
```

### 2. App Store Connect API Key (Recommended for Automation)
To allow EAS to submit to TestFlight without prompting for your password/2FA:
1. Go to [App Store Connect > Users and Access > Keys](https://appstoreconnect.apple.com/access/api).
2. Create a new API Key with **App Manager** access.
3. Download the `.p8` file.
4. Run `npx eas credentials` in the `app/` directory and follow prompts to upload this key.

### 3. Fastlane Installation (Optional for Metadata)
If you want to manage metadata via Fastlane:
```bash
brew install fastlane
```

### 4. Apple ID Setup
I have configured the following in `app/fastlane/Appfile`:
- **Apple ID**: `hassoncs@gmail.com`
- **Team ID**: `73G23Y42T6`
Ensure these match your actual developer account details.

---

## Technical Details

- **EAS Config**: Located in `app/eas.json`.
- **Fastlane Config**: Located in `app/fastlane/`.
- **Unified Script**: `scripts/ship.mjs`.
