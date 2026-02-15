# Font Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the font rendering gaps to enable custom fonts in React Native overlays and unify font handling across Godot and RN layers.

**Architecture:** Create a FontRegistry system that maps FontPreset types to actual font assets, integrate expo-font into OverlayRenderer for dynamic font loading, and extend Godot's TextEffectSystem to support font weight.

**Tech Stack:** expo-font, @expo-google-fonts, FontFile (Godot), React Native Text component

---

## TODOs

- [x] 1. Create FontRegistry Module

- [x] 2. Create FontLoader Hook

- [x] 3. Integrate FontLoader into OverlayRenderer

- [x] 4. Create Font Test Example

- [x] 5. Download and Bundle Core Game Fonts

- [x] 6. Add Font Weight Support to TextEffectSystem

- [x] 7. Verify Font Loading Works

---

## Phase 1: P0 - expo-font Integration (Quick Wins)

### Task 1: Create FontRegistry Module

**Files:**
- Create: `app/lib/game-engine/ui/overlay/FontRegistry.ts`

**Step 1: Create the FontRegistry types and preset mappings**

```typescript
// app/lib/game-engine/ui/overlay/FontRegistry.ts
import { FontPreset } from '@slopcade/shared';

export interface FontAsset {
  name: string;
  source: 'local' | 'google' | 'url';
  // For local fonts, require the asset
  localAsset?: number;
  // For Google fonts, the font family name
  googleFamily?: string;
  // For URL fonts, the TTF/OTF URL
  url?: string;
  // Available weights
  weights?: ('normal' | 'bold')[];
}

// Google Fonts that are commonly used for games
const GOOGLE_FONTS: Record<string, { normal: string; bold?: string }> = {
  'PressStart2P': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf',
  },
  'Bangers': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/bangers/Bangers-Regular.ttf',
  },
  'Modak': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/modak/Modak-Regular.ttf',
  },
  'Fredoka': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Regular.ttf',
    bold: 'https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Bold.ttf',
  },
  'Roboto': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf',
    bold: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf',
  },
  'Inter': {
    normal: 'https://github.com/google/fonts/raw/main/ofl/inter/Inter-Regular.ttf',
    bold: 'https://github.com/google/fonts/raw/main/ofl/inter/Inter-Bold.ttf',
  },
};

// Font preset mappings - maps semantic names to font families
export const FONT_PRESETS: Record<FontPreset, string> = {
  system: 'system',  // Uses platform default
  pixel: 'PressStart2P',
  retro: 'Bangers',
  handwritten: 'Fredoka',
  monospace: 'RobotoMono',  // Will fall back to system monospace if not loaded
};

export function getGoogleFontUrl(family: string, weight: 'normal' | 'bold' = 'normal'): string | undefined {
  const font = GOOGLE_FONTS[family];
  if (!font) return undefined;
  return weight === 'bold' && font.bold ? font.bold : font.normal;
}

export function getFontFamilyFromPreset(preset: FontPreset): string {
  return FONT_PRESETS[preset] ?? 'system';
}
```

**Step 2: Commit**

```bash
git add app/lib/game-engine/ui/overlay/FontRegistry.ts
git commit -m "feat(fonts): add FontRegistry module for font preset mapping"
```

---

### Task 2: Create FontLoader Hook

**Files:**
- Create: `app/lib/game-engine/ui/overlay/useFontLoader.ts`

**Step 1: Create the font loader hook using expo-font**

```typescript
// app/lib/game-engine/ui/overlay/useFontLoader.ts
import { useMemo, useCallback } from 'react';
import * as Font from 'expo-font';
import { FontPreset } from '@slopcade/shared';
import { getGoogleFontUrl, getFontFamilyFromPreset, FONT_PRESETS } from './FontRegistry';

// Track loaded fonts to avoid re-loading
const loadedFonts = new Set<string>();

export interface FontLoaderResult {
  isLoaded: boolean;
  loadFont: (family: string, url: string) => Promise<void>;
  loadPreset: (preset: FontPreset) => Promise<void>;
  getFontFamily: (familyOrPreset?: string) => string;
}

/**
 * Hook to manage font loading for overlay elements.
 * 
 * Usage:
 * ```tsx
 * const { isLoaded, getFontFamily, loadFont } = useFontLoader(config.theme);
 * 
 * if (!isLoaded) return <Loading />;
 * 
 * return <Text style={{ fontFamily: getFontFamily(element.fontFamily) }}>...</Text>;
 * ```
 */
export function useFontLoader(theme?: { fontFamily?: string; fontUrl?: string; fontPreset?: FontPreset }): FontLoaderResult {
  // Pre-load fonts based on theme configuration
  const fontToLoad = useMemo(() => {
    if (theme?.fontUrl) {
      return { family: theme.fontFamily ?? 'CustomFont', url: theme.fontUrl };
    }
    if (theme?.fontPreset && theme.fontPreset !== 'system') {
      const family = getFontFamilyFromPreset(theme.fontPreset);
      const url = getGoogleFontUrl(family);
      if (url) return { family, url };
    }
    if (theme?.fontFamily) {
      const url = getGoogleFontUrl(theme.fontFamily);
      if (url) return { family: theme.fontFamily, url };
    }
    return null;
  }, [theme?.fontFamily, theme?.fontUrl, theme?.fontPreset]);

  const loadFont = useCallback(async (family: string, url: string) => {
    if (loadedFonts.has(family)) return;
    
    try {
      await Font.loadAsync({
        [family]: url,
      });
      loadedFonts.add(family);
    } catch (error) {
      console.warn(`[FontLoader] Failed to load font "${family}" from ${url}:`, error);
    }
  }, []);

  const loadPreset = useCallback(async (preset: FontPreset) => {
    if (preset === 'system') return;
    
    const family = getFontFamilyFromPreset(preset);
    const url = getGoogleFontUrl(family);
    if (url) {
      await loadFont(family, url);
    }
  }, [loadFont]);

  const getFontFamily = useCallback((familyOrPreset?: string): string => {
    if (!familyOrPreset) return 'system';
    
    // Check if it's a preset
    if (familyOrPreset in FONT_PRESETS) {
      const preset = familyOrPreset as FontPreset;
      if (preset === 'system') return 'system';
      return getFontFamilyFromPreset(preset);
    }
    
    // Otherwise, assume it's a font family name
    return familyOrPreset;
  }, []);

  // For now, we don't auto-load - let the overlay trigger loading
  // This keeps the initial render fast
  return {
    isLoaded: true, // We'll render with fallback if font not loaded yet
    loadFont,
    loadPreset,
    getFontFamily,
  };
}

// Export for use outside React components
export { loadedFonts };
```

**Step 2: Commit**

```bash
git add app/lib/game-engine/ui/overlay/useFontLoader.ts
git commit -m "feat(fonts): add useFontLoader hook for expo-font integration"
```

---

### Task 3: Integrate FontLoader into OverlayRenderer

**Files:**
- Modify: `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx`

**Step 1: Add font loading to OverlayRenderer**

Find the `OverlayRenderer` function (around line 39) and modify:

```typescript
// Add import at top
import { useFontLoader } from './useFontLoader';

// Inside OverlayRenderer function, after theme memo:
export function OverlayRenderer({
  config,
  gameState,
  viewportRect,
  getEntityCountByTag,
  onButtonPress,
}: OverlayRendererProps) {
  const ctx = useMemo(
    () => buildBindingContext(gameState, getEntityCountByTag),
    [gameState, getEntityCountByTag],
  );

  const theme = useMemo(() => ({
    ...DEFAULT_THEME,
    ...config.theme,
  }), [config.theme]);

  // Add font loader
  const { getFontFamily } = useFontLoader(config.theme);

  if (viewportRect.width === 0 || viewportRect.height === 0) return null;

  return (
    <View
      style={[
        styles.overlay,
        {
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
        },
      ]}
      pointerEvents="box-none"
    >
      {config.elements.map((el, index) => (
        <AnchoredElement
          key={el.id}
          element={el}
          ctx={ctx}
          theme={theme}
          zIndex={index}
          onButtonPress={onButtonPress}
          getFontFamily={getFontFamily}  // Pass down
        />
      ))}
    </View>
  );
}
```

**Step 2: Update AnchoredElement to pass getFontFamily**

```typescript
function AnchoredElement({
  element,
  ctx,
  theme,
  zIndex,
  onButtonPress,
  getFontFamily,
}: {
  element: OverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  zIndex: number;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
  getFontFamily: (familyOrPreset?: string) => string;
}) {
  if (element.visible === false) return null;
  if (element.visibleWhen && !evaluateCondition(element.visibleWhen, ctx)) return null;

  const anchor = element.anchor ?? 'top-left';
  const offsetX = element.offset?.x ?? 0;
  const offsetY = element.offset?.y ?? 0;
  const anchorStyle = getAnchorStyle(anchor, offsetX, offsetY);
  const isInteractive = element.type === 'button';

  return (
    <View
      style={[styles.anchoredWrapper, anchorStyle, { zIndex }]}
      pointerEvents={isInteractive ? 'auto' : 'none'}
    >
      <ElementRenderer element={element} ctx={ctx} theme={theme} onButtonPress={onButtonPress} getFontFamily={getFontFamily} />
    </View>
  );
}
```

**Step 3: Update ElementRenderer and TextElement**

```typescript
function ElementRenderer({
  element,
  ctx,
  theme,
  onButtonPress,
  getFontFamily,
}: {
  element: OverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
  getFontFamily: (familyOrPreset?: string) => string;
}) {
  switch (element.type) {
    case 'text':
      return <TextElement element={element} ctx={ctx} theme={theme} getFontFamily={getFontFamily} />;
    // ... other cases pass getFontFamily to children that need it
    case 'container':
      return <ContainerElement element={element} ctx={ctx} theme={theme} onButtonPress={onButtonPress} getFontFamily={getFontFamily} />;
    // ... rest unchanged
  }
}

function TextElement({ 
  element, 
  ctx, 
  theme,
  getFontFamily,
}: { 
  element: TextOverlayElement; 
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  getFontFamily: (familyOrPreset?: string) => string;
}) {
  const text = element.bindings?.text
    ? String(resolveBinding('text', element.bindings.text, ctx))
    : element.text ?? '';

  // Resolve font family
  const fontFamily = getFontFamily(element.fontFamily);

  return (
    <Text
      style={[
        {
          fontSize: element.fontSize ?? theme.fontSize,
          color: element.color ?? theme.textColor,
          fontWeight: element.fontWeight ?? 'normal',
          fontFamily: fontFamily === 'system' ? undefined : fontFamily,
          textAlign: element.align ?? 'left',
          textShadowColor: 'rgba(0,0,0,0.75)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        },
        element.maxWidth ? { maxWidth: element.maxWidth } : undefined,
        applyOverlayStyle(element.style),
      ]}
      numberOfLines={element.maxWidth ? 1 : undefined}
      ellipsizeMode={element.maxWidth ? 'tail' : undefined}
    >
      {text}
    </Text>
  );
}
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm build:types`
Expected: No type errors

**Step 5: Commit**

```bash
git add app/lib/game-engine/ui/overlay/OverlayRenderer.tsx
git commit -m "feat(fonts): integrate FontLoader into OverlayRenderer"
```

---

### Task 4: Create Font Test Example

**Files:**
- Create: `app/app/examples/font_test_overlay.tsx`

**Step 1: Create a test example demonstrating font loading**

```typescript
// app/app/examples/font_test_overlay.tsx
import type { ExampleMeta } from '@/lib/registry/types';
import { View, StyleSheet } from 'react-native';
import { GameRuntime } from '@/lib/godot';

export const metadata: ExampleMeta = {
  title: 'Font Test Overlay',
  description: 'Test custom font rendering in React Native overlays',
};

const FONT_TEST_GAME = {
  metadata: {
    id: 'font-test-overlay',
    name: 'Font Test Overlay',
    version: '1.0.0',
  },
  world: {
    width: 800,
    height: 600,
    gravity: { x: 0, y: 0 },
  },
  prefabs: {},
  entities: [],
  variables: {
    score: 0,
    lives: 3,
  },
  overlay: {
    theme: {
      fontPreset: 'pixel',
      textColor: '#FFFFFF',
      fontSize: 16,
      primaryColor: '#4CAF50',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    elements: [
      {
        id: 'title',
        type: 'text',
        anchor: 'top-center',
        offset: { x: 0, y: 20 },
        text: 'Font Test',
        fontSize: 32,
        fontFamily: 'pixel',
      },
      {
        id: 'pixel-text',
        type: 'text',
        anchor: 'top-left',
        offset: { x: 20, y: 80 },
        text: 'Pixel Font (PressStart2P)',
        fontFamily: 'PressStart2P',
        fontSize: 14,
      },
      {
        id: 'retro-text',
        type: 'text',
        anchor: 'top-left',
        offset: { x: 20, y: 120 },
        text: 'Retro Font (Bangers)',
        fontFamily: 'Bangers',
        fontSize: 24,
      },
      {
        id: 'handwritten-text',
        type: 'text',
        anchor: 'top-left',
        offset: { x: 20, y: 160 },
        text: 'Handwritten Font (Fredoka)',
        fontFamily: 'Fredoka',
        fontSize: 20,
      },
      {
        id: 'system-text',
        type: 'text',
        anchor: 'top-left',
        offset: { x: 20, y: 200 },
        text: 'System Font (default)',
        fontFamily: 'system',
        fontSize: 18,
      },
      {
        id: 'score-counter',
        type: 'counter',
        anchor: 'top-right',
        offset: { x: -20, y: 20 },
        iconEmoji: '⭐',
        fontSize: 24,
        bindings: { value: 'score' },
      },
    ],
  },
};

export default function FontTestOverlay() {
  return (
    <View style={styles.container}>
      <GameRuntime 
        game={FONT_TEST_GAME}
        style={styles.game}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  game: {
    flex: 1,
  },
});
```

**Step 2: Regenerate registry**

Run: `pnpm generate:registry`
Expected: New example appears in registry

**Step 3: Commit**

```bash
git add app/app/examples/font_test_overlay.tsx app/lib/registry/generated/examples.ts
git commit -m "feat(fonts): add font test overlay example"
```

---

## Phase 2: P1 - Bundle Core Fonts

### Task 5: Download and Bundle Core Game Fonts

**Files:**
- Create: `app/assets/fonts/PressStart2P-Regular.ttf`
- Create: `app/assets/fonts/Bangers-Regular.ttf`
- Create: `app/assets/fonts/Fredoka-Regular.ttf`
- Create: `app/assets/fonts/Fredoka-Bold.ttf`
- Modify: `app/lib/game-engine/ui/overlay/FontRegistry.ts`

**Step 1: Create fonts directory and download fonts**

```bash
mkdir -p app/assets/fonts

# Download Google Fonts (OFL licensed)
curl -L "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf" -o app/assets/fonts/PressStart2P-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/bangers/Bangers-Regular.ttf" -o app/assets/fonts/Bangers-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Regular.ttf" -o app/assets/fonts/Fredoka-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Bold.ttf" -o app/assets/fonts/Fredoka-Bold.ttf
```

**Step 2: Update FontRegistry to use bundled fonts**

```typescript
// Add at top of FontRegistry.ts
import PressStart2P from '@/assets/fonts/PressStart2P-Regular.ttf';
import Bangers from '@/assets/fonts/Bangers-Regular.ttf';
import FredokaRegular from '@/assets/fonts/Fredoka-Regular.ttf';
import FredokaBold from '@/assets/fonts/Fredoka-Bold.ttf';

// Add BUNDLED_FONTS export
export const BUNDLED_FONTS: Record<string, { normal: any; bold?: any }> = {
  'PressStart2P': { normal: PressStart2P },
  'Bangers': { normal: Bangers },
  'Fredoka': { normal: FredokaRegular, bold: FredokaBold },
};
```

**Step 3: Commit**

```bash
git add app/assets/fonts/ app/lib/game-engine/ui/overlay/FontRegistry.ts
git commit -m "feat(fonts): bundle core game fonts for offline support"
```

---

## Phase 3: P1 - Godot Font Weight Support

### Task 6: Add Font Weight Support to TextEffectSystem

**Files:**
- Modify: `godot_project/scripts/effects/TextEffectSystem.gd`

**Step 1: Update _load_font to handle weight**

Find the `_load_font` function (around line 79) and modify:

```gdscript
func _load_font(font_config: Dictionary) -> FontFile:
    var url = font_config.get("url", "")
    var weight = font_config.get("weight", "normal")
    
    if url == "":
        return ThemeDB.fallback_font
    
    # Include weight in cache key
    var cache_key = "%s_%s" % [url, weight]
    if _font_cache.has(cache_key):
        return _font_cache[cache_key]
    
    # For URL-based fonts, we need to handle weight variants
    # If the URL is for a variable font, we can set weight
    # For static fonts, the URL should point to the correct weight file
    
    var cache_path = "user://fonts/%s.ttf" % cache_key.md5_text()
    
    if FileAccess.file_exists(cache_path):
        var cached_font = FontFile.new()
        cached_font.load_dynamic_font(cache_path)
        _font_cache[cache_key] = cached_font
        return cached_font
    
    var font = FontFile.new()
    var http = HTTPRequest.new()
    
    # Try to get weight-specific URL
    var weight_url = _get_weight_url(url, weight)
    
    var result = await _download_font(weight_url, http)
    if result.success:
        font.data = result.data
        
        # Apply variable font weight if supported
        if font_config.get("isVariable", false):
            var variation = FontVariation.new()
            variation.base_font = font
            variation.variation_opentype = {
                "wght": 400 if weight == "normal" else 700
            }
            _font_cache[cache_key] = variation
            return variation
        
        DirAccess.make_dir_recursive_absolute("user://fonts")
        var f = FileAccess.open(cache_path, FileAccess.WRITE)
        f.store_buffer(result.data)
        f.close()
        
        _font_cache[cache_key] = font
    else:
        push_warning("[TextEffectSystem] Failed to download font from %s, using fallback" % weight_url)
        font = ThemeDB.fallback_font
    
    http.queue_free()
    return font

func _get_weight_url(url: String, weight: String) -> String:
    # If the URL pattern suggests weight variants, adjust it
    # Common patterns:
    # - Regular.ttf -> Bold.ttf
    # - -Regular. -> -Bold.
    if weight == "bold":
        var bold_url = url.replace("Regular", "Bold").replace("-Regular.", "-Bold.")
        # Note: This is a best-effort; the actual URL should be provided in font_config
        return bold_url
    return url
```

**Step 2: Update create_text_effect_node to pass weight**

```gdscript
func _create_msdf_node(text_config: Dictionary, font_config: Dictionary, effects: Dictionary) -> Label:
    var label = Label.new()
    
    var font = await _load_font(font_config)
    if font_config.get("useMsdf", false):
        font.multichannel_signed_distance_field = true
        font.msdf_pixel_range = font_config.get("msdfPixelRange", 16)
    
    label.add_theme_font_override("font", font)
    label.add_theme_font_size_override("font_size", text_config.get("fontSize", 32))
    label.text = text_config.get("content", "")
    
    # Apply font weight if FontVariation
    var weight = font_config.get("weight", "normal")
    if font is FontVariation:
        label.add_theme_font_override("font", font)
    elif weight == "bold":
        # For non-variable fonts, we'd need to load the bold variant
        pass
    
    var shader = _get_msdf_shader()
    var material = ShaderMaterial.new()
    material.shader = shader
    
    var sdf_effects = effects.get("sdfEffects", {})
    _apply_msdf_params(material, text_config, sdf_effects)
    
    label.material = material
    return label
```

**Step 3: Commit**

```bash
git add godot_project/scripts/effects/TextEffectSystem.gd
git commit -m "feat(fonts): add font weight support to Godot TextEffectSystem"
```

---

## Verification

### Task 7: Verify Font Loading Works

**Step 1: Run the font test example**

```bash
pnpm dev
# Navigate to /examples/font_test_overlay in the app
```

Expected: 
- All fonts render correctly in overlay
- Pixel font shows chunky pixelated text
- Retro font shows bold display text
- Handwritten font shows rounded friendly text
- System font shows platform default

**Step 2: Test offline functionality**

1. Load the example
2. Enable airplane mode
3. Reload the app
4. Verify bundled fonts still work

---

## Summary

| Phase | Task | Effort | Status |
|-------|------|--------|--------|
| P0 | FontRegistry module | S | Pending |
| P0 | useFontLoader hook | S | Pending |
| P0 | OverlayRenderer integration | S | Pending |
| P0 | Font test example | S | Pending |
| P1 | Bundle core fonts | M | Pending |
| P1 | Godot font weight | S | Pending |

**Estimated Total:** Medium (2-3 hours)
