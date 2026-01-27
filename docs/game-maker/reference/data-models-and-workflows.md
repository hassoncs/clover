# Game Generation: Data Models & Workflows

> **Complete Reference**: How data flows from prompt to playable game with AI-generated assets

---

## Table of Contents

1. [Current Workflow](#current-workflow-as-of-jan-2026)
2. [Data Models](#data-models)
3. [Proposed Workflow](#proposed-workflow-two-phase-pipeline)
4. [Asset Types](#asset-types-by-entity)
5. [Performance Metrics](#performance-metrics)

---

## Current Workflow (As of Jan 2026)

### Step-by-Step Flow

```
┌───────────────┐
│ User Prompt   │  "I want a cat to launch balls at blocks"
└───────┬───────┘
        │
        v
┌───────────────────────────┐
│ 1. Classify Intent        │  api/src/ai/classifier.ts
│ classifyPrompt()          │  
└───────┬───────────────────┘
        │ GameIntent { gameType: 'projectile', theme: 'cats', ... }
        v
┌───────────────────────────┐
│ 2. LLM Generation         │  api/src/ai/generator.ts
│ generateGame()            │  Uses GPT-4o via OpenRouter
└───────┬───────────────────┘
        │ GameDefinition (entities with SHAPE sprites)
        v
┌───────────────────────────┐
│ 3. Validate               │  api/src/ai/validator.ts
│ validateGameDefinition()  │  Check structure, physics, behaviors
└───────┬───────────────────┘
        │ ValidationResult { valid: true/false, errors: [] }
        v
┌───────────────────────────┐
│ 4. Return to Client       │  tRPC: /games/generate
│ Playable game (shapes)    │
└───────────────────────────┘

❌ Asset generation NEVER happens
```

### What Gets Generated

**Example Output:**
```json
{
  "metadata": {
    "id": "game-12345",
    "title": "Cat Ball Launcher",
    "version": "1.0.0"
  },
  "entities": [
    {
      "id": "launcher-cat",
      "tags": ["player"],
      "transform": { "x": 2, "y": 9 },
      "sprite": {
        "type": "circle",
        "radius": 0.5,
        "color": "#FF9800"
      },
      "physics": {
        "bodyType": "static",
        "shape": "circle",
        "radius": 0.5
      },
      "behaviors": [
        { "type": "control", "controlType": "drag_to_aim" },
        { "type": "spawn_on_event", "entityTemplate": "ball" }
      ]
    }
  ]
}
```

**Note**: `sprite.type` is always `rect`, `circle`, or `polygon`. Never `image`.

---

## Data Models

### Core Types

#### GameDefinition (`shared/src/types/GameDefinition.ts`)

```typescript
interface GameDefinition {
  metadata: {
    id: string;
    title: string;
    description?: string;
    version: string;
    thumbnailUrl?: string;
  };
  
  world: {
    gravity: Vec2;              // { x: 0, y: 10 }
    pixelsPerMeter: number;     // 50 (conversion factor)
    bounds: {
      width: number;            // In meters (e.g., 20)
      height: number;           // In meters (e.g., 12)
    };
  };
  
  templates: Record<string, EntityTemplate>;  // Reusable entity blueprints
  entities: GameEntity[];                     // Actual game objects
  
  winCondition: WinCondition;    // { type: 'destroy_all', tag: 'enemy' }
  loseCondition: LoseCondition;  // { type: 'lives_zero' }
  
  camera?: CameraConfig;
  ui?: UIConfig;
  rules?: GameRule[];
}
```

#### GameEntity (`shared/src/types/entity.ts`)

```typescript
interface GameEntity {
  id: string;                    // "player-cat", "block-1"
  name: string;                  // "Cat Launcher"
  template?: string;             // Reference to templates["ball"]
  
  transform: {
    x: number;                   // Position in meters
    y: number;
    angle: number;               // Radians
    scaleX: number;
    scaleY: number;
  };
  
  sprite?: SpriteComponent;      // Visual representation
  physics?: PhysicsComponent;    // Godot physics body config
  behaviors?: Behavior[];        // Game logic (control, spawn, score, etc.)
  tags?: string[];               // ["player", "controllable"]
  
  layer?: number;                // Render order (higher = front)
  visible?: boolean;
  active?: boolean;
}
```

#### SpriteComponent (`shared/src/types/sprite.ts`)

```typescript
type SpriteComponent =
  | RectSpriteComponent
  | CircleSpriteComponent
  | PolygonSpriteComponent
  | ImageSpriteComponent;

// Current usage: Only rect/circle/polygon
interface RectSpriteComponent {
  type: 'rect';
  width: number;
  height: number;
  color?: string;
  strokeColor?: string;
  opacity?: number;
}

interface CircleSpriteComponent {
  type: 'circle';
  radius: number;
  color?: string;
}

// Future usage: ImageSpriteComponent
interface ImageSpriteComponent {
  type: 'image';
  imageUrl: string;      // CDN URL from scenario.com
  imageWidth: number;    // Render size in pixels
  imageHeight: number;
  opacity?: number;
  tint?: string;
}
```

#### PhysicsComponent (`shared/src/types/physics.ts`)

```typescript
interface PhysicsComponent {
  bodyType: 'static' | 'dynamic' | 'kinematic';
  shape: 'box' | 'circle' | 'polygon';
  
  // Shape-specific dimensions
  width?: number;       // For box (meters)
  height?: number;
  radius?: number;      // For circle (meters)
  vertices?: Vec2[];    // For polygon
  
  // Physics properties
  density: number;      // 1.0 = normal
  friction: number;     // 0.5 = normal
  restitution: number;  // 0.0 = no bounce, 0.8 = bouncy
  
  // Optimization flags
  bullet?: boolean;     // For fast-moving objects
  sensor?: boolean;     // No collision, events only
}
```

#### Behavior System (`shared/src/types/behavior.ts`)

```typescript
type Behavior =
  | ControlBehavior              // User input
  | SpawnOnEventBehavior         // Create entities
  | DestroyOnCollisionBehavior   // Remove on hit
  | ScoreOnCollisionBehavior     // Award points
  | MoveBehavior                 // Constant motion
  | OscillateBehavior            // Back and forth
  | RotateBehavior               // Spin
  | FollowBehavior;              // Track target

// Example: Player control
interface ControlBehavior {
  type: 'control';
  controlType: 'drag_to_aim' | 'tap_to_jump' | 'drag_to_move' | 'tilt_to_move';
  force?: number;
  aimLine?: boolean;
}

// Example: Spawning projectiles
interface SpawnOnEventBehavior {
  type: 'spawn_on_event';
  event: 'tap' | 'release' | 'collision' | 'timer';
  entityTemplate: string;       // Reference to templates
  spawnPosition?: 'at_self' | 'at_target';
  maxCount?: number;            // Limit total spawned
  cooldown?: number;            // Milliseconds between spawns
}
```

---

## Proposed Workflow (Two-Phase Pipeline)

### Phase 1: Generate Playable Game (~3-5s)

```
User Prompt: "cat launches balls at blocks"
    ↓
┌────────────────────────────────┐
│ 1. classifyPrompt()            │
│    Extract game intent         │
└────────┬───────────────────────┘
         │ GameIntent { gameType: 'projectile', theme: 'cats' }
         ↓
┌────────────────────────────────┐
│ 2. LLM (GPT-4o)                │
│    Generate GameDefinition     │
│    WITH assetRequest[] ← NEW!  │
└────────┬───────────────────────┘
         │ GameDefinition + AssetRequest[]
         ↓
┌────────────────────────────────┐
│ 3. Validate                    │
└────────┬───────────────────────┘
         │ ValidationResult
         ↓
┌────────────────────────────────┐
│ 4. Create Enrichment Job       │
│    Start async asset gen       │
└────────┬───────────────────────┘
         │
         ├─→ Return Immediately: { game (shapes), assetJobId }
         │
         └─→ Background: Generate assets in parallel
```

### Phase 2: Asset Enrichment (~30-90s, async)

```
AssetRequest[] = [
  { category: 'character', description: 'orange cat' },
  { category: 'item', description: 'red ball' },
  { category: 'platform', description: 'stone block' }
]
    ↓
┌────────────────────────────────┐
│ 1. Deduplicate by Hash         │
│    (category + desc + style)   │
└────────┬───────────────────────┘
         │ Unique requests
         ↓
┌────────────────────────────────┐
│ 2. Check Cache                 │
│    R2 + DB lookup              │
└────────┬───────────────────────┘
         │ Cache misses
         ↓
┌────────────────────────────────┐
│ 3. Parallel Generation         │
│    scenario.com (4 workers)    │
│     - Worker 1: cat (30s)      │
│     - Worker 2: ball (30s)     │
│     - Worker 3: block (67s)    │
│     - Worker 4: (idle)         │
└────────┬───────────────────────┘
         │ Map<requestId, AssetRef>
         ↓
┌────────────────────────────────┐
│ 4. Patch Entities              │
│    sprite: shape → image       │
│    Preserve fallbackSprite     │
└────────┬───────────────────────┘
         │ Enriched GameDefinition
         ↓
┌────────────────────────────────┐
│ 5. Notify Client               │
│    Poll /asset-jobs/:id        │
│    or SSE update               │
└────────────────────────────────┘
```

---

## Asset Types by Entity

### What Needs Assets vs What Doesn't

| Entity Type | Needs Assets? | Asset Category | Example |
|-------------|---------------|----------------|---------|
| Player | ✅ Yes | `character` | Cat, knight, hero |
| Enemy | ✅ Yes | `enemy` | Slime, dragon, monster |
| Collectible | ✅ Yes | `item` | Coin, star, gem |
| Projectile | ✅ Optional | `item` | Ball, arrow, bullet |
| Platform | ✅ Yes | `platform` | Grass tile, stone block |
| Ground | ⚠️ Maybe | `platform` | Can be solid color or textured |
| Background | ✅ Yes | `background` | Forest, space, castle |
| Walls | ❌ No | N/A | Usually invisible bounds |
| Spawners | ❌ No | N/A | Logic entities, not visible |
| UI Elements | ✅ Yes | `ui` | Buttons, health bars |

### Asset Requirements Inference

**From Entity Tags:**
```typescript
tags: ["player"] → category: "character"
tags: ["enemy"] → category: "enemy"
tags: ["collectible"] → category: "item"
tags: ["ground", "platform"] → category: "platform"
tags: ["projectile"] → category: "item" (optional)
```

**From Entity ID:**
```typescript
"player-cat" → extract: "cat" → description: "orange tabby cat"
"enemy-dragon" → extract: "dragon" → description: "fierce red dragon"
"coin-gold" → extract: "gold coin" → description: "shiny gold coin"
```

**From Theme (Global Style):**
```typescript
GameIntent.theme: "cats" + style: "pixel"
  → styleHint: "16-bit pixel art" for ALL assets
  → Ensures visual consistency
```

---

## Current vs Proposed Data Models

### Current Entity (Shape Sprites Only)

```json
{
  "id": "player-cat",
  "name": "Cat Launcher",
  "transform": { "x": 2, "y": 9, "angle": 0 },
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#FF9800"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.5,
    "density": 1.0
  },
  "behaviors": [
    { "type": "control", "controlType": "drag_to_aim" }
  ],
  "tags": ["player"]
}
```

### Proposed Entity (With Asset Pipeline)

```json
{
  "id": "player-cat",
  "name": "Cat Launcher",
  "transform": { "x": 2, "y": 9, "angle": 0 },
  
  "size": { "width": 1, "height": 1 },
  
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#FF9800"
  },
  
  "assetRequest": {
    "id": "req-cat-001",
    "category": "character",
    "description": "orange tabby cat, pixel art, side view, game sprite",
    "styleHint": "16-bit pixel art",
    "desiredPixelSize": { "width": 256, "height": 256 },
    "priority": "critical"
  },
  
  "asset": {
    "assetUrl": "https://assets.clover.app/generated/character/uuid.png",
    "scenarioAssetId": "asset-abc123",
    "pixelSize": { "width": 256, "height": 256 }
  },
  
  "fallbackSprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#FF9800"
  },
  
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.5,
    "density": 1.0
  },
  
  "behaviors": [
    { "type": "control", "controlType": "drag_to_aim" }
  ],
  
  "tags": ["player"]
}
```

**Key Differences:**
- ✅ `size`: Stable gameplay dimensions (physics uses this)
- ✅ `assetRequest`: Explicit asset generation intent
- ✅ `asset`: Populated after enrichment (Phase 2)
- ✅ `fallbackSprite`: Preserved for offline/failure modes

### After Enrichment (Phase 2 Complete)

```json
{
  "sprite": {
    "type": "image",
    "imageUrl": "https://assets.clover.app/generated/character/uuid.png",
    "imageWidth": 256,
    "imageHeight": 256
  }
}
```

**Note**: Original circle sprite moved to `fallbackSprite`.

---

## Workflow Comparison

### Current: Single-Phase (Shapes Only)

| Step | Time | Blocking? | Output |
|------|------|-----------|--------|
| Classify prompt | <100ms | Yes | GameIntent |
| LLM generation | 3-5s | Yes | GameDefinition |
| Validate | <50ms | Yes | ValidationResult |
| **TOTAL** | **~5s** | **Yes** | **Shapes only** |

**User Experience**: Fast but disappointing (no art).

### Proposed: Two-Phase (Shapes + Assets)

| Step | Time | Blocking? | Output |
|------|------|-----------|--------|
| **Phase 1** | | | |
| Classify prompt | <100ms | Yes | GameIntent |
| LLM generation | 3-5s | Yes | GameDefinition + AssetRequest[] |
| Validate | <50ms | Yes | ValidationResult |
| Create asset job | <100ms | Yes | assetJobId |
| **Return to client** | **~5s** | **Yes** | **Playable game (shapes)** |
| | | | |
| **Phase 2 (Async)** | | | |
| Dedupe requests | <50ms | No | Unique requests |
| Cache lookup | <500ms | No | Cache hits/misses |
| Parallel generation | 30-90s | No | Asset URLs |
| Patch entities | <100ms | No | Enriched GameDefinition |
| Notify client | <50ms | No | Updated game |

**User Experience**: Instant playability → assets stream in → polished game.

---

## Asset Types by Entity

### Character Assets (Players, NPCs)

**Category**: `character`  
**Models**:
- Pixel art static: `model_retrodiffusion-plus` (256×256, 30s)
- Pixel art animated: `model_retrodiffusion-animation` (384×64, 46s)
- Cartoon: `model_c8zak5M1VGboxeMd8kJBr2fn` (512×512, 29s)

**Prompt Template:**
```
pixel art {DESCRIPTION} character, 16-bit style, side view,
transparent background, game sprite, clean edges
```

**Example Descriptions:**
- "orange tabby cat with green eyes"
- "brave knight in silver armor"
- "small red bird with yellow beak"

### Enemy Assets

**Category**: `enemy`  
**Models**: Same as character  
**Prompt Template:**
```
pixel art {DESCRIPTION} enemy character, 16-bit style, side view,
menacing appearance, transparent background, game sprite
```

**Example Descriptions:**
- "green slime monster with angry eyes"
- "fire-breathing dragon"
- "robotic spider"

### Item Assets (Collectibles, Projectiles)

**Category**: `item`  
**Models**:
- Pixel art: `model_retrodiffusion-plus` (64×64, 30s)
- 3D icons: `model_7v2vV6NRvm8i8jJm6DWHf6DM` (256×256, 12s)

**Prompt Template:**
```
pixel art {DESCRIPTION} icon, 16-bit style, centered,
transparent background, game item, simple design
```

**Example Descriptions:**
- "shiny gold coin"
- "red soccer ball"
- "blue diamond gem"

### Platform Assets (Tiles, Blocks)

**Category**: `platform`  
**Models**:
- Tileable: `model_retrodiffusion-tile` (256×256, 67s)
- Standard: `model_retrodiffusion-plus` (256×256, 30s)

**Prompt Template:**
```
pixel art {DESCRIPTION} tile, 16-bit style, top-down view,
tileable seamless pattern, game tileset, no border artifacts
```

**Example Descriptions:**
- "grass ground tile"
- "stone block"
- "wooden platform"

**Note**: Tileable assets can be repeated to create longer platforms.

### Background Assets

**Category**: `background`  
**Models**:
- Pixel art: `model_uM7q4Ms6Y5X2PXie6oA9ygRa` (512×256, 35s)
- Cartoon: `model_hHuMquQ1QvEGHS1w7tGuYXud` (1024×512, 10s)

**Prompt Template:**
```
pixel art {DESCRIPTION} scene, 16-bit style,
game background, parallax-ready
```

**Example Descriptions:**
- "forest with trees and bushes"
- "blue sky with clouds"
- "medieval castle interior"

### UI Assets

**Category**: `ui`  
**Models**:
- Game UI: `model_mcYj5uGzXteUw6tKapsaDgBP` (128×64, varies)

**Prompt Template:**
```
game UI {DESCRIPTION}, 16-bit style,
clean design, transparent background
```

**Example Descriptions:**
- "green start button"
- "red and green health bar"
- "score counter display"

---

## Performance Metrics

### Generation Times (Measured from Real API Tests)

**Per Asset:**
| Model Type | Min | Avg | Max |
|------------|-----|-----|-----|
| Pixel static | 25s | 30s | 45s |
| Pixel animated | 40s | 46s | 60s |
| Pixel tile | 60s | 67s | 90s |
| Cartoon | 20s | 29s | 40s |
| 3D icons | 10s | 12s | 20s |

**Typical Game (10 entities):**
- Sequential: 10 × 30s = **300s (5 minutes)** ❌
- Parallel (4 workers): ceil(10/4) × 30s = **90s** ✅
- With 50% cache hit: 5 × 30s / 4 = **45s** ⚡

### Bandwidth Usage

**Per Asset:**
- Pixel art PNG: 8-20 KB
- Cartoon JPG: 18-40 KB
- Animated GIF: 15-25 KB

**Typical Game (10 assets):**
- Total download: ~150-300 KB
- On 4G (10 Mbps): <1s
- On 3G (1 Mbps): 2-3s

---

## Database Schema Changes Needed

### Add Asset Jobs Table

```sql
CREATE TABLE asset_enrichment_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  total_count INTEGER NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_asset_jobs_game_id ON asset_enrichment_jobs(game_id);
CREATE INDEX idx_asset_jobs_status ON asset_enrichment_jobs(status);
```

### Add Asset Cache Table

```sql
CREATE TABLE asset_cache (
  cache_key TEXT PRIMARY KEY,        -- Hash of (category + description + style + size)
  asset_url TEXT NOT NULL,
  scenario_asset_id TEXT,
  pixel_width INTEGER,
  pixel_height INTEGER,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  style TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX idx_asset_cache_category ON asset_cache(category);
CREATE INDEX idx_asset_cache_last_used ON asset_cache(last_used_at);
```

---

## Error Handling Strategy

### Failure Modes

| Failure | Impact | Recovery |
|---------|--------|----------|
| scenario.com down | No assets generated | Use shape sprites (game still playable) |
| Partial failure | Some assets missing | Patch successful, shapes for failed |
| Timeout | Slow generation | Retry once, then fail gracefully |
| Invalid prompt | Asset gen fails | Use generic asset for category |
| R2 upload error | Asset lost | Retry upload 3x, then fail |

### Graceful Degradation

```typescript
// Entity with failed asset generation
{
  "sprite": { "type": "circle", "color": "#FF9800" },  // Fallback
  "assetRequest": { /* original request */ },          // For retry
  "asset": null,                                       // Failed
  "assetError": "Timeout after 90s"                    // Debug info
}
```

**User sees**: Orange circle instead of cat sprite (game still plays).

---

## Cache Strategy

### Cache Key Generation

```typescript
function generateCacheKey(request: AssetRequest): string {
  const normalized = normalizeDescription(request.description);
  return hash({
    category: request.category,
    description: normalized,
    style: request.styleHint ?? 'pixel',
    width: request.desiredPixelSize?.width ?? 256,
    height: request.desiredPixelSize?.height ?? 256,
  });
}

function normalizeDescription(desc: string): string {
  return desc.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Cache Lookup Flow

```typescript
async function getOrGenerateAsset(request: AssetRequest): Promise<AssetRef> {
  const cacheKey = generateCacheKey(request);
  
  // 1. Check cache
  const cached = await db.query(
    'SELECT * FROM asset_cache WHERE cache_key = ?',
    [cacheKey]
  );
  
  if (cached) {
    // Update hit count and last_used_at
    await db.query(
      'UPDATE asset_cache SET hit_count = hit_count + 1, last_used_at = ? WHERE cache_key = ?',
      [Date.now(), cacheKey]
    );
    
    return {
      assetUrl: cached.asset_url,
      scenarioAssetId: cached.scenario_asset_id,
      pixelSize: {
        width: cached.pixel_width,
        height: cached.pixel_height,
      },
    };
  }
  
  // 2. Generate new asset
  const result = await assetService.generateAsset(request);
  
  // 3. Store in cache
  await db.query(
    'INSERT INTO asset_cache (cache_key, asset_url, ...) VALUES (?, ?, ...)',
    [cacheKey, result.assetUrl, ...]
  );
  
  return result;
}
```

### Cache Eviction

- **Strategy**: LRU (Least Recently Used)
- **Trigger**: When cache exceeds size limit (e.g., 10,000 entries)
- **Keep**: Assets with `hit_count > 5` (frequently used)
- **Evict**: Assets not used in 30+ days

---

## Sprite Sizing Coordination

### The Problem

- Physics body: `radius: 0.5` (meters) = 25 pixels at `pixelsPerMeter: 50`
- Generated asset: 256×256 pixels
- How to render asset to match physics?

### The Solution

**Entity stores canonical size:**
```typescript
entity.size = { width: 1, height: 1 };  // In meters
```

**Renderer scales asset to fit:**
```typescript
const renderWidth = entity.size.width * world.pixelsPerMeter;   // 50px
const renderHeight = entity.size.height * world.pixelsPerMeter; // 50px

// Render 256×256 asset scaled down to 50×50
ctx.drawImage(
  assetImage,
  0, 0, 256, 256,           // Source (full asset)
  x, y, renderWidth, renderHeight  // Destination (scaled)
);
```

**Result**: Asset fills physics body exactly, regardless of original pixel dimensions.

---

## API Changes Needed

### 1. Update `/games/generate` Response

**Before:**
```typescript
{
  game: GameDefinition,
  intent: GameIntent,
  validation: { valid: true }
}
```

**After:**
```typescript
{
  game: GameDefinition,          // Playable with shapes
  assetJobId?: string,           // NEW: for polling
  assetsGenerating: boolean,     // NEW: UI indicator
  intent: GameIntent,
  validation: { valid: true }
}
```

### 2. Add New Endpoints

```typescript
// Check asset generation progress
GET /asset-jobs/:jobId
Response: {
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: 0.67,  // 67% complete
  completedCount: 6,
  totalCount: 9,
  estimatedTimeRemaining: 30  // seconds
}

// Get game with assets applied
GET /games/:gameId/enriched?jobId=xxx
Response: {
  game: GameDefinition  // With sprite.type='image'
}

// Regenerate assets for existing game
POST /games/:gameId/assets/regenerate
Request: {
  entities?: string[],  // Optional: only regenerate specific entities
  style?: string        // Optional: change style
}
Response: {
  assetJobId: string
}
```

---

## Frontend Integration

### React Hook Example

```typescript
function useGameWithAssets(prompt: string) {
  const [game, setGame] = useState<GameDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    async function generate() {
      const result = await trpc.games.generate.mutate({ prompt });
      
      setGame(result.game);
      setLoading(false);
      
      if (result.assetsGenerating && result.assetJobId) {
        setAssetsLoading(true);
        pollForAssets(result.game.metadata.id, result.assetJobId);
      }
    }
    
    generate();
  }, [prompt]);
  
  async function pollForAssets(gameId: string, jobId: string) {
    const interval = setInterval(async () => {
      const status = await trpc.games.getAssetJobStatus.query({ jobId });
      
      setProgress(status.progress);
      
      if (status.status === 'completed') {
        clearInterval(interval);
        
        const { game: enriched } = await trpc.games.getEnrichedGame.query({
          gameId,
          jobId,
        });
        
        setGame(enriched);
        setAssetsLoading(false);
      }
    }, 2000);
  }
  
  return { game, loading, assetsLoading, progress };
}
```

### UI Example

```typescript
function GameGeneratorScreen() {
  const { game, loading, assetsLoading, progress } = useGameWithAssets(userPrompt);
  
  if (loading) return <Spinner />;
  
  return (
    <>
      <GameCanvas game={game} />
      
      {assetsLoading && (
        <ProgressBar
          progress={progress}
          label="Generating AI sprites..."
        />
      )}
    </>
  );
}
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
// AssetRequest extraction
it('extracts assetRequests from entities', () => {
  const game = generateGame('cat vs blocks');
  expect(game.assetRequests).toContainEqual({
    category: 'character',
    description: expect.stringContaining('cat'),
  });
});

// Deduplication
it('deduplicates identical asset requests', () => {
  const requests = [
    { id: 'a', category: 'item', description: 'ball' },
    { id: 'b', category: 'item', description: 'ball' },  // Duplicate
  ];
  const unique = deduplicateRequests(requests);
  expect(unique).toHaveLength(1);
});

// Cache lookup
it('returns cached asset if exists', async () => {
  await seedCache({ key: 'cat-pixel-256', url: 'https://...' });
  const result = await getOrGenerateAsset({ description: 'cat', ... });
  expect(result.fromCache).toBe(true);
});
```

### 2. Integration Tests

```typescript
// End-to-end with real APIs
it('generates game and enriches with scenario.com assets', async () => {
  const result = await generateGame('cat launches balls');
  expect(result.assetJobId).toBeDefined();
  
  // Wait for enrichment
  await waitForJob(result.assetJobId, { timeout: 120000 });
  
  const enriched = await getEnrichedGame(result.game.metadata.id, result.assetJobId);
  expect(enriched.entities[0].sprite.type).toBe('image');
  expect(enriched.entities[0].asset.assetUrl).toMatch(/^https:\/\//);
}, 180000);
```

### 3. Visual Tests

```bash
# Generate test game and inspect assets
hush run -- npx tsx api/src/ai/__tests__/generate-game-with-assets.ts \
  --prompt="cat launches balls at blocks" \
  --output=./test-output/
```

---

## Implementation Checklist

### Backend
- [ ] Add `AssetRequest`, `AssetRef` types to `shared/src/types/entity.ts`
- [ ] Update `EntitySchema` in `api/src/ai/schemas.ts`
- [ ] Modify LLM prompts in `api/src/ai/generator.ts`
- [ ] Create `api/src/ai/asset-enrichment.ts`
- [ ] Add `extractAssetRequests()` helper
- [ ] Implement `AssetEnrichmentService`
- [ ] Add database migrations for jobs + cache tables
- [ ] Update `api/src/trpc/routes/games.ts` endpoints
- [ ] Add unit tests for enrichment logic
- [ ] Add integration tests with real scenario.com

### Frontend
- [ ] Update game generation UI to handle `assetJobId`
- [ ] Add polling logic for asset status
- [ ] Show progress indicator during enrichment
- [ ] Re-render game when assets complete
- [ ] Add "Regenerate Assets" button
- [ ] Handle partial asset failures in UI

### Verification
- [ ] Generate 10 test games with various prompts
- [ ] Verify all have `assetRequest` fields
- [ ] Measure enrichment time (target: <90s)
- [ ] Test cache hit rates
- [ ] Test failure scenarios (API down, timeouts)
- [ ] Verify fallback sprites work

---

## Migration Path

### Week 1: Foundation
1. Add data model fields (non-breaking, all optional)
2. Implement `AssetEnrichmentService`
3. Update LLM prompts
4. Add database tables

### Week 2: Integration
1. Wire up enrichment in `/games/generate`
2. Add polling endpoints
3. Test with real games
4. Monitor performance

### Week 3: Frontend
1. Add polling UI
2. Show progress indicators
3. Handle asset streaming
4. Polish UX

### Week 4: Optimization
1. Implement caching
2. Tune concurrency limits
3. Add staged loading (critical assets first)
4. Performance monitoring

---

## Questions This Document Answers

- ✅ What data models are needed? → AssetRequest, AssetRef, enriched Entity
- ✅ What's the workflow? → Two-phase: instant shapes + async enrichment
- ✅ How to coordinate sizes? → Entity.size is stable, assets scale to fit
- ✅ Parallel or sequential? → Parallel with 4-8 workers
- ✅ How to handle failures? → Graceful degradation to shape sprites
- ✅ What about caching? → Hash-based cache with LRU eviction
- ✅ How long will it take? → 5s instant + 30-90s enrichment
- ✅ What API changes needed? → Add assetJobId, polling endpoints
- ✅ Can assets be regenerated? → Yes, separate endpoint
- ✅ Testing strategy? → Unit + integration + visual tests
