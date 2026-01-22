# Icon Generation Skill

**Use this skill when**: Asked to create, update, or generate app icons, favicons, or any icon assets for web, iOS, or Android applications.

**Triggers**: "create icons", "generate favicon", "make app icon", "update icons", "icon sizes", "iOS icon", "Android icon"

---

## Overview

This skill provides the COMPLETE workflow for generating all required icon sizes for modern web and mobile applications (Expo, React Native, web apps) from a single source image. No research needed - everything is here.

## Complete Icon Size Requirements (2026)

### For Expo Apps (iOS + Web)

#### 1. **Primary App Icon** (Expo/iOS)
- **1024x1024** - Main app icon (required)
  - Location: `app/assets/icon.png`
  - Referenced in: `app.json` → `expo.icon`
  - Purpose: iOS App Store, app bundle
  - Format: PNG (no transparency for iOS)

#### 2. **Web Favicons** (Browser Support)
Core sizes (MUST HAVE):
- **16x16** - Browser tabs, bookmarks
- **32x32** - High-DPI browser tabs, Windows taskbar
- **48x48** - Windows desktop shortcut, Expo web favicon
- **180x180** - Apple Touch Icon (iOS home screen when saved)
- **192x192** - Android Chrome, PWA manifest
- **512x512** - PWA splash screens, Google Search results

Optional (nice to have):
- **96x96** - Google TV
- **128x128** - Chrome Web Store
- **144x144** - Windows 8 tiles
- **152x152** - iPad touch icon
- **167x167** - iPad Pro
- **384x384** - PWA (intermediate size)

### File Locations

```
app/
├── assets/
│   ├── icon.png              # 1024x1024 (Expo app icon)
│   └── favicon.png            # 48x48 (Expo web favicon)
├── public/
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── apple-touch-icon.png   # 180x180
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
└── ios/
    └── {app-name}/
        └── Images.xcassets/
            └── AppIcon.appiconset/
                ├── App-Icon-1024x1024@1x.png  # 1024x1024 (iOS native)
                └── Contents.json
```

**CRITICAL**: After updating `app/assets/icon.png`, you MUST also copy it to the iOS native location for changes to appear in iOS builds.

## Step-by-Step Workflow

### Phase 1: Verify Source Image

```bash
# Check source image dimensions and format
file path/to/source-image.{png,jpg,jpeg,svg}
```

**Requirements**:
- Minimum 1024x1024 (for best quality)
- Ideally square aspect ratio
- PNG or JPEG format (SVG also works)

### Phase 2: Generate All Sizes

#### Option A: Using `sips` (macOS - RECOMMENDED, built-in, no installation)

```bash
# Navigate to project root
cd /path/to/project

# Step 1: Convert source to PNG and resize to 1024x1024 (if needed)
sips -s format png SOURCE_IMAGE --out /tmp/icon-source.png
sips -z 1024 1024 /tmp/icon-source.png --out app/assets/icon.png

# Step 2: Generate all icon sizes from the 1024x1024 source
sips -z 48 48 app/assets/icon.png --out app/assets/favicon.png
sips -z 180 180 app/assets/icon.png --out app/public/apple-touch-icon.png
sips -z 192 192 app/assets/icon.png --out app/public/android-chrome-192x192.png
sips -z 512 512 app/assets/icon.png --out app/public/android-chrome-512x512.png
sips -z 16 16 app/assets/icon.png --out app/public/favicon-16x16.png
sips -z 32 32 app/assets/icon.png --out app/public/favicon-32x32.png
sips -z 48 48 app/assets/icon.png --out app/public/favicon-48x48.png

# Step 3: Copy to iOS native location (CRITICAL for iOS builds)
cp app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
```

**`sips` syntax**:
- `-s format png` - Convert to PNG format
- `-z HEIGHT WIDTH` - Resize to exact dimensions (maintains aspect ratio, crops if needed)
- `--out` - Output file path
- Built into macOS, no installation required

#### Option B: Using ImageMagick (Cross-platform)

```bash
# Navigate to project root
cd /path/to/project

# Generate 1024x1024 app icon
magick source-image.jpg -resize 1024x1024 -gravity center -extent 1024x1024 app/assets/icon.png

# Generate all favicon sizes
magick app/assets/icon.png -resize 16x16 app/public/favicon-16x16.png
magick app/assets/icon.png -resize 32x32 app/public/favicon-32x32.png
magick app/assets/icon.png -resize 48x48 app/public/favicon-48x48.png
magick app/assets/icon.png -resize 180x180 app/public/apple-touch-icon.png
magick app/assets/icon.png -resize 192x192 app/public/android-chrome-192x192.png
magick app/assets/icon.png -resize 512x512 app/public/android-chrome-512x512.png

# Generate favicon for assets
magick app/assets/icon.png -resize 48x48 app/assets/favicon.png

# Copy to iOS native location
cp app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
```

**ImageMagick syntax**:
- `-resize WxH` scales the image
- `-gravity center` centers the image
- `-extent WxH` ensures exact dimensions (adds padding if needed)

#### One-Liner: Complete Icon Update (macOS with sips)

```bash
# Replace SOURCE_IMAGE with your source file path
SOURCE_IMAGE="/path/to/new-icon.jpg"

# One-liner that does everything
sips -s format png "$SOURCE_IMAGE" --out /tmp/icon-1024.png && \
sips -z 1024 1024 /tmp/icon-1024.png --out app/assets/icon.png && \
sips -z 48 48 app/assets/icon.png --out app/assets/favicon.png && \
sips -z 180 180 app/assets/icon.png --out app/public/apple-touch-icon.png && \
sips -z 192 192 app/assets/icon.png --out app/public/android-chrome-192x192.png && \
sips -z 512 512 app/assets/icon.png --out app/public/android-chrome-512x512.png && \
sips -z 16 16 app/assets/icon.png --out app/public/favicon-16x16.png && \
sips -z 32 32 app/assets/icon.png --out app/public/favicon-32x32.png && \
sips -z 48 48 app/assets/icon.png --out app/public/favicon-48x48.png && \
cp app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png && \
echo "✅ All icons generated and placed successfully!"
```

### Phase 3: Verify Icons Are in Correct Locations

If you used the one-liner above, icons are already placed. Otherwise, ensure these files exist:

```bash
# Verify all icons exist
ls -lh app/assets/icon.png                    # Should be ~1-2MB, 1024x1024
ls -lh app/assets/favicon.png                 # Should be ~5-10KB, 48x48
ls -lh app/public/favicon-*.png               # 3 files (16, 32, 48)
ls -lh app/public/apple-touch-icon.png        # 180x180
ls -lh app/public/android-chrome-*.png        # 2 files (192, 512)
ls -lh app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png

# Verify dimensions
file app/assets/icon.png                       # Should show: 1024 x 1024
file app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png

# Verify checksums match (iOS and assets should be identical)
md5 app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
```

**CRITICAL**: The iOS native icon (`app/ios/.../App-Icon-1024x1024@1x.png`) MUST match `app/assets/icon.png` exactly. If checksums don't match, copy again:

```bash
cp app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
```

### Phase 4: Verify Configuration

#### Expo `app.json`

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

**Verification**:
- `icon` → points to 1024x1024 PNG
- `web.favicon` → points to 48x48 PNG
- Paths are relative to `app.json` location

#### HTML (for non-Expo web apps)

If you need to manually add favicon links to HTML:

```html
<head>
  <!-- Standard favicons -->
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
  
  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  
  <!-- Android/PWA -->
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
  
  <!-- Fallback -->
  <link rel="icon" href="/favicon.ico" />
</head>
```

**Note**: Expo automatically generates HTML with favicon references from `app.json`. You don't need to manually edit HTML for Expo projects.

### Phase 5: Test Build

```bash
# Expo web build
cd app && pnpm build

# Verify icons in dist/
ls -lh dist/*.png
grep "favicon" dist/*.html

# Check that all expected icons exist:
# - dist/favicon-16x16.png
# - dist/favicon-32x32.png
# - dist/favicon-48x48.png
# - dist/apple-touch-icon.png
# - dist/android-chrome-192x192.png
# - dist/android-chrome-512x512.png
```

## Alternative: Using Online Tools (Not Recommended)

While online favicon generators exist (realfavicongenerator.net, favicon.io), they often:
- Generate 20+ files (most unused)
- Include outdated formats (Windows 8 tiles, etc.)
- Require manual download and organization

**Recommendation**: Use the ImageMagick approach above for full control and minimal output.

## Platform-Specific Notes

### iOS
- **1024x1024** is the ONLY size you need to provide
- iOS automatically generates all other sizes (60x60, 76x76, 120x120, 152x152, 167x167, 180x180)
- No transparency allowed (background must be opaque)
- Square format (iOS applies rounded corners automatically)

### Android
- Expo handles Android icon generation from the 1024x1024 source
- For advanced: Use adaptive icons (separate foreground/background layers)
- Not covered in this basic workflow

### Web (PWA)
- **192x192** and **512x512** are PWA manifest requirements
- Include in `manifest.json` or `manifest.webmanifest`:

```json
{
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Common Issues & Solutions

### Issue: iOS icon not updating after rebuild
**Solution**: 
1. Verify icon was copied to iOS native location:
   ```bash
   ls -lh app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
   ```
2. Verify checksums match:
   ```bash
   md5 app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
   ```
3. If checksums don't match, copy again:
   ```bash
   cp app/assets/icon.png app/ios/*/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
   ```
4. Clean build and rebuild:
   ```bash
   rm -rf app/ios/build
   cd app && npx expo run:ios
   ```

### Issue: Icons not updating in browser
**Solution**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear browser cache

### Issue: ImageMagick not installed
**Solution**: 

**macOS users**: Use `sips` instead (built-in, no installation needed). See Phase 2 Option A above.

**If you need ImageMagick**:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows (use Scoop or Chocolatey)
scoop install imagemagick
```

### Issue: Source image is rectangular, not square
**Solution**: Use `-gravity center -extent WxH` to crop/pad to square:
```bash
magick source.jpg -resize 1024x1024^ -gravity center -extent 1024x1024 output.png
```
(The `^` ensures the smaller dimension fills the target size)

### Issue: Icons look blurry on high-DPI displays
**Solution**: Always start from high-resolution source (2048x2048 or larger) and scale down

### Issue: Expo build fails with "icon not found"
**Solution**: 
1. Verify path in `app.json` is relative to the JSON file
2. Check file actually exists at that path
3. Ensure filename matches exactly (case-sensitive)

## Checklist

Use this checklist for every icon generation task:

- [ ] Source image acquired (min 1024x1024, ideally 2048x2048)
- [ ] Generated 1024x1024 app icon
- [ ] Generated 6 core favicon sizes (16, 32, 48, 180, 192, 512)
- [ ] Placed app icon in `app/assets/icon.png`
- [ ] **Copied app icon to iOS native location** (`app/ios/.../App-Icon-1024x1024@1x.png`)
- [ ] Verified iOS and assets icons match (checksums identical)
- [ ] Placed favicon in `app/assets/favicon.png`
- [ ] Placed web favicons in `app/public/`
- [ ] Verified `app.json` configuration
- [ ] For iOS: Clean build (`rm -rf app/ios/build`) and rebuild
- [ ] For Web: Ran build and verified icons in `dist/`
- [ ] Tested in browser (favicon appears in tab)
- [ ] Archived original source images

## Quick Reference

| Size | Purpose | Location | Required |
|------|---------|----------|----------|
| 1024x1024 | iOS App Store, App Icon | `assets/icon.png` | ✅ YES |
| 1024x1024 | iOS Native Build | `ios/.../AppIcon.appiconset/App-Icon-1024x1024@1x.png` | ✅ YES |
| 48x48 | Expo Web Favicon | `assets/favicon.png` | ✅ YES |
| 16x16 | Browser Tab | `public/favicon-16x16.png` | ✅ YES |
| 32x32 | Browser Tab (Hi-DPI) | `public/favicon-32x32.png` | ✅ YES |
| 48x48 | Desktop Shortcut | `public/favicon-48x48.png` | ✅ YES |
| 180x180 | iOS Home Screen | `public/apple-touch-icon.png` | ✅ YES |
| 192x192 | Android/PWA | `public/android-chrome-192x192.png` | ✅ YES |
| 512x512 | PWA Splash | `public/android-chrome-512x512.png` | ✅ YES |

## Research Sources (January 2026)

Authoritative sources used to compile this skill:
- [Expo Documentation - app.json](https://docs.expo.dev/versions/latest/config/app/)
- [Evil Martians - How to Favicon in 2025](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [Apple iOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Premium Favicon - Complete Guide 2024](https://www.premiumfavicon.com/blog/favicon-sizes-complete-guide)
- [Mobile Action - App Icon Guide 2026](https://www.mobileaction.co/guide/app-icon-guide/)

## Version History

- **2026-01-21 (v2)**: Added iOS native location, `sips` commands (macOS), one-liner script, verification steps
- **2026-01-21 (v1)**: Initial version - Comprehensive Expo + Web icon workflow
