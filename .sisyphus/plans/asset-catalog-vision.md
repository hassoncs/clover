# Future Vision: Asset Catalog & Semantic Search

> **Status**: Far future. Only pursue if users ask for "browse my assets" or "find similar" features.
> 
> **Prerequisite**: Ship MVP first. See if anyone even wants this.

## The Vision

An AI game builder where:
1. User says "Make a game where bad guys come out of a cave"
2. AI identifies pieces needed (cave emitter, enemies, projectiles)
3. System searches for matching assets: "Do we have a cave?"
4. Interactive selection: "Found 3 caves - which one?"
5. Game assembled with selected assets

## Why We're Not Doing This Now

- Primary workflow is generate → tweak → regenerate
- Users iterate on prompts, not browse catalogs
- We have dozens of assets, not millions
- ILIKE search on `prompt` field is probably fine for now
- Vector databases add complexity and cost

---

## Deep Dive: Three-Layer Architecture

If we ever need sophisticated asset matching, the model has three layers:

| Layer | What | Where Stored |
|-------|------|--------------|
| **1. Gameplay Structure** | Physics, behaviors, collision | `games.definition` JSON |
| **2. Semantic Role** | What it represents | `assets.description` (free text) |
| **3. Visual Theme** | Generated images | `assets` table |

### Structural Matching (Typed, Indexed)

For slot fit - does this asset physically work in this slot?

```sql
-- Can we use this asset for a 3x2 box slot?
SELECT * FROM assets 
WHERE shape = 'box' 
  AND width BETWEEN 2.5 AND 3.5 
  AND height BETWEEN 1.5 AND 2.5;
```

**Fields that matter for structural fit:**
- `shape` (box, circle, polygon)
- `width`, `height` (dimensions in world units)
- `asset_type` (entity, background, sprite_sheet)

### Semantic Matching (Future: Vector Search)

For "what is it" - does this asset represent what I need?

**Option A: Trigram Search (Simple)**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_assets_prompt_trgm ON assets USING gin (prompt gin_trgm_ops);

-- "cave" matches "cavern", "cave opening", etc.
SELECT * FROM assets WHERE prompt % 'cave' ORDER BY similarity(prompt, 'cave') DESC;
```

**Option B: Vector Embeddings (Advanced)**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE assets ADD COLUMN embedding VECTOR(1536);

-- Semantic similarity search
SELECT * FROM assets 
ORDER BY embedding <-> get_embedding('dark cave with enemies')
LIMIT 10;
```

---

## Structured Metadata Approach (Rejected)

We considered typed appearance metadata:

```sql
appearance_data JSONB  -- { "category": "emitter", "tags": ["spawns"], "hints": {...} }
```

**Why we rejected it:**
- Can't anticipate all fields ("hollow", "bouncy", "glowing"...)
- AI must output structured JSON correctly (brittle)
- Typos break matching ("emmiter" vs "emitter")
- Semantic search solves this more elegantly

---

## Composite/Multi-Part Assets

For depth-layered entities (cave openings, portals):

```sql
CREATE TYPE asset_file_role AS ENUM (
  'primary_image',
  'composite_back',    -- Renders behind entity
  'composite_front',   -- Renders in front of entity
  'composite_mask',
  'thumbnail'
);

CREATE TABLE asset_files (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  file_role asset_file_role,
  url TEXT NOT NULL,
  z_offset INTEGER,    -- -1 for back, +1 for front
  UNIQUE(asset_id, file_role)
);
```

**Use case**: Cave spawner where enemies appear to emerge from inside.

---

## Semantic Role on Templates

If we need structured semantic info on entity templates:

```typescript
interface SemanticRole {
  category: string;              // "emitter", "surface", "actor"
  tags?: string[];               // ["spawns", "hostile"]
  hints?: Record<string, string>; // { "open_direction": "right" }
  description?: string;          // Free-form for AI
}
```

**Decided against** - just use free-text description and let AI handle semantics.

---

## Hash-Based Deduplication

For exact-match asset reuse:

```typescript
// Structural hash - same physics fit
function computeStructuralHash(asset: Asset): string {
  const data = { shape: asset.shape, width: round(asset.width), height: round(asset.height) };
  return sha256(JSON.stringify(data)).slice(0, 32);
}

// Request hash - exact same generation request
function computeRequestHash(params: GenerationParams): string {
  const data = { prompt: params.prompt, theme: params.themeId, structural: params.structural };
  return sha256(JSON.stringify(data)).slice(0, 32);
}
```

**Use case**: Don't regenerate if we already have an identical asset.

---

## Theme Versioning

For evolving theme prompts while keeping published games stable:

```sql
CREATE TABLE theme_versions (
  id UUID PRIMARY KEY,
  theme_id UUID REFERENCES themes(id),
  version_number INTEGER,
  prompt_modifier TEXT,
  created_at TIMESTAMP,
  UNIQUE(theme_id, version_number)
);

-- Assets lock to a specific theme version
ALTER TABLE assets ADD COLUMN theme_version_id UUID REFERENCES theme_versions(id);
```

---

## Asset Selection Presets

Curated collections of assets that work well together:

```sql
CREATE TABLE asset_selection_presets (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  target_game_id UUID,        -- Which game template this preset is for
  creator_user_id UUID,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0
);

CREATE TABLE preset_entries (
  preset_id UUID REFERENCES asset_selection_presets(id),
  slot_id TEXT,
  asset_id UUID REFERENCES assets(id),
  PRIMARY KEY (preset_id, slot_id)
);
```

**Use case**: "Forest theme pack for Peggle" - a curated set of assets.

---

## Polygon Canonicalization

For hashing polygon shapes consistently:

```typescript
function canonicalizePolygon(vertices: Vec2[]): Vec2[] {
  // 1. Find lexicographically smallest vertex
  // 2. Rotate array so it's first
  // 3. Ensure counter-clockwise winding
  // ... (see original plan for full implementation)
}
```

---

## Constants Decided

| Constant | Value | Rationale |
|----------|-------|-----------|
| Pixels per unit | 100 | Simple math, standardized |
| Hash algorithm | SHA256, first 32 hex chars | 128-bit, URL-safe |
| Rotation matching | NO | Assets have perspective baked in |

---

## Migration Path (If We Go There)

1. **MVP** (now): Simple assets table, ILIKE search
2. **Trigram search**: Add pg_trgm extension, index on prompt
3. **Structural indexing**: Add composite index on (shape, width, height)
4. **Vector search**: Add pgvector, embedding column
5. **Multi-file assets**: Add asset_files table
6. **Presets**: Add preset tables for curated collections

Each step is additive. Nothing in MVP prevents future expansion.
