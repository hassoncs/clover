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

### 3. Fastlane Installation (Required for Metadata)
Install Fastlane to manage App Store metadata:
```bash
brew install fastlane
```

Fastlane will prompt for your Apple ID password and 2FA code when running `pnpm ship metadata`.

### 4. Apple ID Setup
Configured in `app/fastlane/Appfile`:
- **Apple ID**: `hassoncs@gmail.com`
- **Team ID**: `73G23Y42T6`
- **Bundle ID**: `me.ch5.slopcade.app`

---

## Managing App Store Metadata

All App Store metadata (descriptions, screenshots, keywords, URLs) is stored locally in `app/fastlane/metadata/`.

### Initial Setup

1. **Download existing metadata** (if app already exists in App Store Connect):
   ```bash
   cd app
   fastlane download_metadata
   fastlane download_screenshots
   ```

2. **Or use the provided example metadata** in `app/fastlane/metadata/en-US/`

### Metadata Files

All metadata is stored as plain text files:

```
app/fastlane/
├── metadata/
│   ├── en-US/
│   │   ├── name.txt              # App name (30 chars max)
│   │   ├── subtitle.txt          # Subtitle (30 chars max)
│   │   ├── description.txt       # Full description (4000 chars max)
│   │   ├── keywords.txt          # Keywords (comma-separated, 100 chars max)
│   │   ├── promotional_text.txt  # Promotional text (170 chars max)
│   │   ├── release_notes.txt     # What's new (4000 chars max)
│   │   ├── support_url.txt
│   │   └── marketing_url.txt
│   ├── default/
│   │   ├── support_url.txt       # Shared across all languages
│   │   ├── marketing_url.txt
│   │   └── privacy_url.txt
│   ├── primary_category.txt      # EDUCATION, GAMES, etc.
│   ├── secondary_category.txt
│   └── review_information/
│       ├── first_name.txt
│       ├── last_name.txt
│       ├── email_address.txt
│       ├── phone_number.txt
│       └── notes.txt             # Notes for App Review team
└── screenshots/
    └── en-US/
        ├── 1_main_screen.png     # Auto-detected by dimensions
        └── 2_game_editor.png
```

### Screenshot Requirements

| Device | Resolution | Notes |
|--------|------------|-------|
| iPhone 6.7" | 1290 × 2796 | iPhone 14/15 Pro Max |
| iPhone 6.5" | 1242 × 2688 | iPhone 11 Pro Max, XS Max |
| iPad 12.9" | 2048 × 2732 | iPad Pro (3rd gen) |

Place screenshots in `app/fastlane/screenshots/en-US/` and Fastlane will auto-detect device type.

### Syncing Metadata

Upload all metadata and screenshots to App Store Connect:
```bash
pnpm ship metadata
```

This command:
- Uploads all text metadata from `app/fastlane/metadata/`
- Uploads all screenshots from `app/fastlane/screenshots/`
- Does NOT upload a new binary (use `pnpm ship native` for that)
- Does NOT auto-submit for review (always manual)

### Adding Localizations

To add a new language (e.g., Spanish):
```bash
mkdir -p app/fastlane/metadata/es-ES
cp app/fastlane/metadata/en-US/*.txt app/fastlane/metadata/es-ES/
# Edit es-ES/*.txt files with Spanish translations
mkdir -p app/fastlane/screenshots/es-ES
# Add Spanish screenshots
pnpm ship metadata
```

---

## Technical Details

- **EAS Config**: `app/eas.json`
- **Fastlane Config**: `app/fastlane/Fastfile`, `app/fastlane/Appfile`
- **Metadata Storage**: `app/fastlane/metadata/`
- **Screenshots**: `app/fastlane/screenshots/` (gitignored)
- **Unified Script**: `scripts/ship.mjs`
