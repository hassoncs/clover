# App Store Screenshots

This directory stores screenshots for App Store Connect, organized by language.

## Directory Structure

```
screenshots/
├── en-US/
│   ├── 1_main_screen.png
│   ├── 2_game_editor.png
│   └── ...
└── [other locales]/
```

## Screenshot Requirements

### iPhone
- **6.7" Display (iPhone 14 Pro Max, 15 Pro Max)**: 1290 x 2796 pixels
- **6.5" Display (iPhone 11 Pro Max, XS Max)**: 1242 x 2688 pixels
- **5.5" Display (iPhone 8 Plus)**: 1242 x 2208 pixels

### iPad
- **12.9" iPad Pro (3rd gen)**: 2048 x 2732 pixels
- **12.9" iPad Pro (2nd gen)**: 2048 x 2732 pixels

## Adding Screenshots

1. Place screenshots in the appropriate language folder (e.g., `en-US/`)
2. Name them descriptively or numerically (e.g., `1_main_screen.png`)
3. Fastlane will auto-detect device type based on dimensions
4. Run `pnpm ship metadata` to upload

## Downloading Existing Screenshots

```bash
cd app
fastlane download_screenshots
```

## Notes

- Screenshots are .gitignored due to size
- Store source files separately if needed
- Consider using Fastlane's `frameit` for device frames
