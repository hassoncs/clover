# Slopcade Vision

> **The North Star**: Anyone can create, remix, and play infinite variations of games

---

## Core Philosophy

### Everything is Remixable

The fundamental insight: **Games are not monolithic**. They're composed of:

1. **Game Engine** - The rules, physics, and logic
2. **Templates** - The entities that exist (ball, paddle, brick)
3. **Assets** - The visuals for those entities
4. **Theme** - The aesthetic direction

Each of these layers can be mixed and matched independently.

```
┌─────────────────────────────────────────────────────────────┐
│                     GAME = ENGINE + VISUALS                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   GAME ENGINE (Logic)          VISUALS (Assets)              │
│   ├── Physics rules            ├── Ball sprite               │
│   ├── Scoring system           ├── Paddle sprite             │
│   ├── Win/lose conditions      ├── Brick sprites             │
│   ├── Entity behaviors         └── Background                │
│   └── Templates definitions                                  │
│                                                              │
│   Engine defines WHAT exists   Assets define HOW it looks    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Layer | What it defines | Can be shared? |
|-------|-----------------|----------------|
| **Theme** | Aesthetic prompt ("dark Halloween") | ✅ Across all games |
| **Asset Pack** | Specific images for a game's templates | ✅ Across game forks |
| **Game Engine** | Rules, physics, templates | ✅ Via forking |
| **Game Instance** | Specific config + active pack | Individual |

---

## The Data Model

### Themes (Global, Reusable)

A theme is a **reusable aesthetic direction** that can be applied to ANY game.

```
Theme: "Halloween"
├── Prompt: "dark spooky halloween with pumpkins, bats, orange and black"
├── Style: "pixel"
└── Used by:
    ├── Breakout Halloween Pack
    ├── Slopeggle Halloween Pack
    └── Flappy Bird Halloween Pack
```

Themes are **game-agnostic**. The same "Halloween" theme can generate assets for Breakout, Slopeggle, or any other game.

### Game Engines (Forkable)

A game engine defines:

```
Game Engine: "Breakout Bouncer"
├── Templates:
│   ├── ball (circle, bounces)
│   ├── paddle (rectangle, player-controlled)
│   ├── brick (rectangle, destroyable)
│   └── wall (rectangle, static)
├── Rules:
│   ├── Ball bounces off paddle and walls
│   ├── Ball destroys bricks on collision
│   ├── Player loses life if ball falls below paddle
│   └── Win when all bricks destroyed
└── Physics:
    ├── Gravity: none
    ├── Bounce coefficient: 1.0
    └── Ball speed: 300
```

Game engines can be **forked**. When you fork:
- You get your own copy of the rules
- You can modify anything
- Your fork shares asset packs with the original (same `base_game_id`)

### Asset Packs (Game-Specific Collections)

An asset pack is a **complete set of visuals** for a specific game engine.

```
Asset Pack: "Breakout Halloween"
├── Game: Breakout Bouncer
├── Theme: Halloween
└── Entries:
    ├── ball → 🎃 (pumpkin sprite)
    ├── paddle → 🦇 (bat sprite)
    ├── brick → 💀 (skull sprite)
    └── wall → 🕸️ (cobweb sprite)
```

Asset packs are tied to a **game family** (all forks share them), not individual game instances.

### Assets (Individual Images)

An asset is a **single generated or uploaded image**.

```
Asset: abc123
├── R2 Key: "generated/breakout/halloween-pack/ball.png"
├── Theme: Halloween (what generated it)
├── Prompt: "A spooky pumpkin ball, dark halloween theme, pixel art..."
└── Used in: Breakout Halloween Pack (ball slot)
```

Assets know which theme generated them, enabling cross-referencing ("show me all Halloween assets").

---

## The Fork Model

### How Forking Works

```
Original Game: "Breakout Classic"
├── base_game_id: game_001
├── forked_from_id: NULL
├── Templates: [ball, paddle, brick, wall]
└── Asset Packs: [Classic, Halloween, Sci-Fi]

    ↓ User forks

Forked Game: "My Breakout"
├── base_game_id: game_001  ← Same! Shares asset packs
├── forked_from_id: game_001
├── Templates: [ball, paddle, brick, wall, powerup]  ← Can add templates
└── Asset Packs: [Classic, Halloween, Sci-Fi]  ← Inherited access
```

Key insight: **Forks share `base_game_id`**, so they can use each other's asset packs.

### Fork Lineage

```
Original (base_game_id: A, forked_from: NULL)
    │
    ├── Fork 1 (base_game_id: A, forked_from: Original)
    │       │
    │       └── Fork 1.1 (base_game_id: A, forked_from: Fork 1)
    │
    └── Fork 2 (base_game_id: A, forked_from: Original)
```

All games in this tree share `base_game_id: A` and can use the same asset packs.

---

## The Generation Flow

### Creating a Themed Version

```
1. User selects game: "Breakout Bouncer"
2. User selects theme: "Halloween" (or creates new)
3. System creates asset pack with theme_id
4. For each template in game:
   a. Combine: theme prompt + template description
   b. Generate image via AI
   c. Upload to R2
   d. Create asset record
   e. Create pack entry (template → asset)
5. Mark pack complete
6. Activate pack on game
7. Game now shows Halloween visuals!
```

### The Prompt Hierarchy

```
Final Prompt = Theme Prompt + Template Description + Style Modifiers

Example:
├── Theme: "dark spooky halloween with pumpkins and bats"
├── Template: "a bouncing ball, round, game sprite"
├── Style: "pixel art, 16-bit, clean edges"
└── Final: "dark spooky halloween with pumpkins and bats, a bouncing ball, 
           round, game sprite, pixel art, 16-bit, clean edges"
```

---

## Principles

### 1. No URL Storage

URLs are **always constructed**, never stored:

```typescript
// Database stores R2 keys
asset.r2_key = "generated/game123/pack456/ball.png"

// URLs constructed at runtime
url = `${CDN_BASE_URL}/${asset.r2_key}`
```

Why: URLs change (CDN migration, domain changes). Keys are stable.

### 2. Single Source of Truth

Each piece of data lives in exactly one place:

| Data | Lives in | NOT in |
|------|----------|--------|
| Theme prompt | `themes.prompt_modifier` | `asset_packs.prompt_defaults_json` |
| Asset image | `assets.r2_key` | Duplicated URLs |
| Template→Asset mapping | `pack_entries` | Game definition JSON |
| Active pack | `game.definition.assetSystem.activePackId` | Separate table |

### 3. Normalized, Not Duplicated

Three tables, clear relationships:

```
themes (1) ←── (many) asset_packs (1) ←── (many) pack_entries (many) ──→ (1) assets
```

No data duplication. Changes propagate correctly.

### 4. Everything Has an Owner

```
Theme → creator_user_id (who made this theme)
Asset → creator_user_id (who generated this)
Pack → creator_user_id (who created this pack)
Game → user_id (who owns this game)
```

Enables attribution, permissions, and discovery.

### 5. Soft Deletes

Nothing is truly deleted. Everything has `deleted_at`:

```sql
WHERE deleted_at IS NULL  -- Only show active records
```

Enables recovery and audit trails.

---

## User Journeys

### Journey 1: Play Someone's Game

```
1. Browse games
2. Click play on "Breakout Halloween"
3. Game loads with Halloween asset pack
4. Play!
```

### Journey 2: Fork and Retheme

```
1. Playing "Breakout Classic"
2. Click "Fork"
3. Now own "My Breakout" (copy of the game)
4. Click "Change Theme"
5. Select "Sci-Fi" theme
6. System generates Sci-Fi assets for all templates
7. Play my Sci-Fi Breakout!
```

### Journey 3: Create New Theme

```
1. Go to Themes page
2. Click "Create Theme"
3. Enter: "Underwater Ocean" + "deep sea coral reef, fish, bubbles, blue tones"
4. Theme created (no assets yet)
5. Apply to any game to generate assets
```

### Journey 4: Explore Theme Gallery

```
1. Go to Theme: "Halloween"
2. See all asset packs using this theme:
   - Breakout Halloween (5 assets)
   - Slopeggle Halloween (8 assets)
   - Flappy Bird Halloween (3 assets)
3. See all assets generated with this theme
4. Click any to see it in action
```

### Journey 5: Modify Game Engine

```
1. Fork "Breakout Classic"
2. Open game editor
3. Add new template: "powerup"
4. Define physics and behavior
5. Generate asset for powerup using current theme
6. Publish modified game
```

---

## Technical Architecture

### Database Schema

```
┌─────────────┐
│   themes    │
├─────────────┤
│ id          │◄─────────────────────┐
│ name        │                      │
│ prompt      │                      │
│ style       │                      │
└─────────────┘                      │
       ▲                             │
       │                             │
       │                             │
┌──────┴──────┐      ┌───────────────┴───┐      ┌─────────────┐
│   assets    │      │   asset_packs     │      │    games    │
├─────────────┤      ├───────────────────┤      ├─────────────┤
│ id          │◄──┐  │ id                │      │ id          │
│ r2_key      │   │  │ name              │  ┌──►│ definition  │
│ theme_id    │   │  │ base_game_id ─────┼──┘   │ base_game_id│
│ prompt      │   │  │ theme_id          │      └─────────────┘
└─────────────┘   │  └─────────┬─────────┘
                  │            │
                  │    ┌───────┴─────────┐
                  │    │  pack_entries   │
                  │    ├─────────────────┤
                  └────┤ asset_id        │
                       │ pack_id         │
                       │ template_id     │
                       └─────────────────┘
```

### Code Organization

```
shared/
├── types/
│   ├── asset-system.ts    # Theme, Asset, Pack, Entry types
│   └── GameDefinition.ts  # Game engine definition
└── utils/
    └── asset-url.ts       # R2 key → URL construction

api/
├── src/
│   ├── trpc/routes/
│   │   └── asset-system.ts  # All asset/theme/pack APIs
│   └── ai/
│       ├── scenario.ts      # Scenario.com client
│       └── pipeline/        # Generation pipeline
└── scripts/
    └── theme-game.ts        # CLI tool

app/
├── app/
│   ├── admin/themes/        # Theme management UI
│   └── play/[id].tsx        # Game player
└── components/
    └── ThemePicker.tsx      # Theme selection
```

---

## Offline Mode & Local Asset Serving

### The Problem

For native builds (iOS/Android), users should be able to:
1. Download a game with all its assets
2. Play completely offline
3. Switch between online/offline modes

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ASSET RESOLUTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   App requests: "Give me ball.png"                          │
│                      │                                       │
│                      ▼                                       │
│              ┌───────────────┐                              │
│              │ Offline Mode? │                              │
│              └───────┬───────┘                              │
│                      │                                       │
│         ┌────────────┴────────────┐                         │
│         │                         │                         │
│         ▼                         ▼                         │
│   ┌─────────────┐          ┌─────────────┐                 │
│   │   OFFLINE   │          │   ONLINE    │                 │
│   │ Local Server│          │    CDN      │                 │
│   └─────────────┘          └─────────────┘                 │
│         │                         │                         │
│         ▼                         ▼                         │
│   localhost:8765/           cdn.slopcade.com/               │
│   games/breakout/           generated/game123/              │
│   ball.png                  pack456/ball.png                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Downloading a Game

```
1. User clicks "Download for Offline"

2. App fetches game manifest:
   GET /api/games/{id}/offline-manifest
   Returns:
   {
     gameId: "breakout-123",
     packId: "halloween-pack",
     definition: { ... },        // Full game JSON
     scripts: [ ... ],           // Script files
     assets: [
       { templateId: "ball", r2Key: "generated/g/p/ball.png" },
       { templateId: "paddle", r2Key: "generated/g/p/paddle.png" },
       ...
     ]
   }

3. Download Manager downloads each asset:
   - Fetch from CDN: https://cdn.slopcade.com/{r2Key}
   - Save to local: {APP_DATA}/games/{gameId}/{r2Key}

4. Save manifest locally:
   {APP_DATA}/games/{gameId}/manifest.json

5. Mark game as "downloaded" in local DB
```

### Data Flow: Playing Offline

```
1. App starts in offline mode (or no network)

2. Load game from local manifest:
   {APP_DATA}/games/{gameId}/manifest.json

3. Resolve asset URLs through local server:
   - Local server runs on localhost:8765
   - Request: localhost:8765/games/{gameId}/generated/g/p/ball.png
   - Server reads: {APP_DATA}/games/{gameId}/generated/g/p/ball.png
   - Returns the file

4. Game engine receives local URLs, loads images normally
```

### Local Storage Structure

```
{APP_DATA}/
└── slopcade/
    ├── settings.json              # { offlineMode: true/false }
    ├── downloaded-games.json      # List of downloaded game IDs
    └── games/
        ├── breakout-123/
        │   ├── manifest.json      # Game definition + asset list
        │   ├── scripts/
        │   │   └── game-rules.js
        │   └── generated/
        │       └── game123/
        │           └── pack456/
        │               ├── ball.png
        │               ├── paddle.png
        │               └── brick.png
        └── slopeggle-456/
            └── ...
```

### API Endpoints Needed

#### 1. Get Offline Manifest

```typescript
// GET /api/games/{id}/offline-manifest
// Returns everything needed to download a game for offline play

offlineManifest.get({
  gameId: string,
  packId?: string,  // Optional: specific pack, or use active pack
})

Returns: {
  gameId: string,
  packId: string,
  
  // The game definition (full JSON)
  definition: GameDefinition,
  
  // Scripts to download
  scripts: Array<{
    name: string,
    url: string,      // CDN URL to download from
    hash: string,     // For cache validation
  }>,
  
  // Assets to download
  assets: Array<{
    templateId: string,
    r2Key: string,    // Path in R2 (becomes local path)
    url: string,      // Full CDN URL to download from
    width: number,
    height: number,
    hash?: string,    // For cache validation
  }>,
  
  // Total size for progress UI
  totalBytes: number,
}
```

#### 2. Check Download Status (Local)

```typescript
// Local function, not API
async function getDownloadedGames(): Promise<DownloadedGame[]>

Returns: [{
  gameId: string,
  packId: string,
  downloadedAt: number,
  totalAssets: number,
  totalBytes: number,
}]
```

### URL Resolution Changes

```typescript
// shared/src/utils/asset-url.ts

interface AssetUrlConfig {
  offlineMode: boolean;
  localServerUrl: string;   // "http://localhost:8765"
  cdnBaseUrl: string;       // "https://cdn.slopcade.com"
  gameId?: string;          // Required for offline
}

export function getAssetUrl(
  r2Key: string, 
  config: AssetUrlConfig
): string {
  if (config.offlineMode) {
    // Offline: serve from local server
    // localhost:8765/games/{gameId}/{r2Key}
    return `${config.localServerUrl}/games/${config.gameId}/${r2Key}`;
  } else {
    // Online: serve from CDN
    return `${config.cdnBaseUrl}/${r2Key}`;
  }
}
```

### Local Asset Server (Native Only)

A simple HTTP server that runs inside the native app:

```typescript
// app/lib/offline/local-asset-server.ts

import { createServer } from 'http';  // Or use Expo's local server
import * as FileSystem from 'expo-file-system';

const PORT = 8765;
const BASE_PATH = FileSystem.documentDirectory + 'slopcade/games/';

export function startLocalAssetServer() {
  const server = createServer(async (req, res) => {
    // Request: /games/{gameId}/generated/g/p/ball.png
    const match = req.url.match(/^\/games\/([^/]+)\/(.+)$/);
    
    if (!match) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    const [, gameId, assetPath] = match;
    const localPath = `${BASE_PATH}${gameId}/${assetPath}`;
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) {
        res.writeHead(404);
        res.end('Asset not found');
        return;
      }
      
      // Read and serve the file
      const content = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=31536000',
      });
      res.end(Buffer.from(content, 'base64'));
    } catch (err) {
      res.writeHead(500);
      res.end('Server error');
    }
  });
  
  server.listen(PORT);
  console.log(`Local asset server running on http://localhost:${PORT}`);
  
  return server;
}
```

### Download Manager

```typescript
// app/lib/offline/download-manager.ts

import * as FileSystem from 'expo-file-system';

const BASE_PATH = FileSystem.documentDirectory + 'slopcade/games/';

export async function downloadGameForOffline(
  gameId: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  // 1. Fetch manifest from API
  const manifest = await api.games.offlineManifest.query({ gameId });
  
  // 2. Create directory structure
  const gameDir = `${BASE_PATH}${gameId}/`;
  await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });
  
  // 3. Save manifest
  await FileSystem.writeAsStringAsync(
    `${gameDir}manifest.json`,
    JSON.stringify(manifest)
  );
  
  // 4. Download each asset
  let downloaded = 0;
  for (const asset of manifest.assets) {
    const localPath = `${gameDir}${asset.r2Key}`;
    
    // Create parent directories
    const parentDir = localPath.substring(0, localPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    // Download file
    await FileSystem.downloadAsync(asset.url, localPath);
    
    downloaded++;
    onProgress?.(downloaded, manifest.assets.length);
  }
  
  // 5. Mark as downloaded
  await markGameDownloaded(gameId, manifest.packId);
}

export async function deleteOfflineGame(gameId: string): Promise<void> {
  const gameDir = `${BASE_PATH}${gameId}/`;
  await FileSystem.deleteAsync(gameDir, { idempotent: true });
  await unmarkGameDownloaded(gameId);
}

export async function isGameDownloaded(gameId: string): Promise<boolean> {
  const manifestPath = `${BASE_PATH}${gameId}/manifest.json`;
  const info = await FileSystem.getInfoAsync(manifestPath);
  return info.exists;
}
```

### Settings & Mode Toggle

```typescript
// app/lib/offline/settings.ts

interface OfflineSettings {
  offlineMode: boolean;        // Master toggle
  autoDownload: boolean;       // Auto-download played games
  wifiOnlyDownload: boolean;   // Only download on WiFi
}

// React hook for offline mode
export function useOfflineMode() {
  const [settings, setSettings] = useAsyncStorage<OfflineSettings>(
    'offline-settings',
    { offlineMode: false, autoDownload: false, wifiOnlyDownload: true }
  );
  
  const toggleOfflineMode = async (enabled: boolean) => {
    if (enabled) {
      // Start local asset server
      await startLocalAssetServer();
    } else {
      // Stop local asset server
      await stopLocalAssetServer();
    }
    setSettings({ ...settings, offlineMode: enabled });
  };
  
  return { settings, toggleOfflineMode };
}
```

### UI Components

#### Download Button

```tsx
// app/components/DownloadForOfflineButton.tsx

function DownloadForOfflineButton({ gameId }: { gameId: string }) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    isGameDownloaded(gameId).then(setIsDownloaded);
  }, [gameId]);
  
  const handleDownload = async () => {
    setDownloading(true);
    await downloadGameForOffline(gameId, (done, total) => {
      setProgress(done / total);
    });
    setDownloading(false);
    setIsDownloaded(true);
  };
  
  const handleDelete = async () => {
    await deleteOfflineGame(gameId);
    setIsDownloaded(false);
  };
  
  if (downloading) {
    return <ProgressBar progress={progress} />;
  }
  
  if (isDownloaded) {
    return <Button onPress={handleDelete}>Remove Download</Button>;
  }
  
  return <Button onPress={handleDownload}>Download for Offline</Button>;
}
```

#### Offline Mode Toggle

```tsx
// app/app/settings/index.tsx

function OfflineSettingsSection() {
  const { settings, toggleOfflineMode } = useOfflineMode();
  const downloadedGames = useDownloadedGames();
  
  return (
    <Section title="Offline Mode">
      <Toggle
        label="Offline Mode"
        description="Play downloaded games without internet"
        value={settings.offlineMode}
        onValueChange={toggleOfflineMode}
      />
      
      <Text>Downloaded Games: {downloadedGames.length}</Text>
      
      {downloadedGames.map(game => (
        <DownloadedGameRow key={game.gameId} game={game} />
      ))}
    </Section>
  );
}
```

### Development: Simulating Offline Mode

For local development, we can simulate offline mode:

```typescript
// When running locally, use a local file server instead of CDN

const config = {
  offlineMode: process.env.SIMULATE_OFFLINE === 'true',
  localServerUrl: 'http://localhost:8765',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.slopcade.com',
};

// Or run a simple static file server for development:
// npx serve ./test-assets -p 8765
```

### Implementation Phases

| Phase | Tasks |
|-------|-------|
| **1. API** | Add `offlineManifest` endpoint |
| **2. Download** | Create download manager with progress |
| **3. Storage** | Local file structure and manifest storage |
| **4. Server** | Local HTTP server for serving assets |
| **5. Resolution** | Update URL resolution to check offline mode |
| **6. UI** | Download button, settings toggle, progress UI |
| **7. Testing** | Test airplane mode, partial downloads, cache invalidation |

### Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Partial download (interrupted) | Resume from manifest, skip existing files |
| Asset pack updated online | Compare hashes, offer "Update Available" |
| Storage full | Show error, offer to delete other games |
| Downloaded game deleted from server | Keep local copy, mark as "archived" |
| Multiple packs per game | Download active pack, option to download others |

---

## Future Vision

### Phase 1: Current (Asset System V3)
- ✅ Themes table
- ✅ Clean asset/pack/entry schema
- ✅ Theme → Pack → Asset flow
- ✅ Fork with shared packs

### Phase 2: Theme Marketplace
- Public themes with ratings
- "Featured" and "Trending" themes
- Theme creators get attribution
- One-click apply theme to any game

### Phase 3: Asset Marketplace
- Individual assets can be shared
- Mix and match assets from different packs
- "Use this ball sprite in my game"
- Asset creators get attribution

### Phase 4: Game Engine Templates
- Pre-built game engines (Platformer, Puzzle, Shooter)
- "Start from Platformer template"
- Customize rules and physics
- Share game engines with community

### Phase 5: Collaborative Creation
- Multiple users edit same game
- Theme voting ("community chooses next theme")
- Remix chains (see who forked who)
- Attribution and lineage visualization

---

## Glossary

| Term | Definition |
|------|------------|
| **Theme** | A reusable aesthetic direction (prompt + style) |
| **Asset** | A single generated or uploaded image |
| **Asset Pack** | A complete set of assets for a game's templates |
| **Pack Entry** | A single template → asset mapping in a pack |
| **Template** | An entity type defined in a game engine (ball, paddle, etc.) |
| **Game Engine** | The rules, physics, and template definitions |
| **Game Instance** | A specific configuration with an active asset pack |
| **Fork** | A copy of a game that shares the base_game_id |
| **base_game_id** | The root game ID that all forks share |
| **R2 Key** | The path to an asset in Cloudflare R2 storage |

---

## Success Metrics

We'll know we've succeeded when:

1. **Creation is effortless**: Fork → Theme → Play in under 30 seconds
2. **Themes are reused**: Average theme used across 5+ games
3. **Community grows**: Users browse and play each other's themed games
4. **Attribution works**: Creators see their themes/engines being used
5. **No legacy code**: Single code path for CLI and web UI
