# Scenario.com API Integration - Implementation Plan

> Master document for integrating Scenario.com image generation into the Clover game-maker backend.

---

## Overview

**Goal**: Enable the backend to generate game sprites via Scenario.com API, store them in R2, and serve URLs that the frontend's `ImageRenderer` can consume.

**Source Reference**: `/Users/hassoncs/Workspaces/Personal/scenario-image-gen` (MCP implementation to copy patterns from)

---

## Architecture

```
Frontend (Expo)                          Backend (Cloudflare Worker)
┌─────────────────┐                     ┌─────────────────────────────────────┐
│ GameRenderer    │                     │                                     │
│   └─ ImageRenderer ◄─────────────────┼─ R2 CDN URL                         │
│       └─ useImage(url)               │                                     │
└─────────────────┘                     │  tRPC Router                        │
        │                               │    └─ assets.generate               │
        │ tRPC                          │    └─ assets.generateBatch          │
        ▼                               │    └─ assets.get                    │
┌─────────────────┐                     │         │                           │
│ trpc.assets.*   │────────────────────▶│         ▼                           │
└─────────────────┘                     │  AssetService (assets.ts)           │
                                        │    └─ generateSprite()              │
                                        │    └─ generateAnimation()           │
                                        │    └─ removeBackground()            │
                                        │         │                           │
                                        │         ▼                           │
                                        │  ScenarioClient (scenario.ts)       │
                                        │    └─ createJob()                   │
                                        │    └─ pollJob()                     │
                                        │    └─ downloadAsset()               │
                                        │         │                           │
                                        │         ▼                           │
                                        │  ┌─────────────┐  ┌──────────────┐  │
                                        │  │ Scenario.com│  │ R2 Storage   │  │
                                        │  │ API         │  │ (images)     │  │
                                        │  └─────────────┘  └──────────────┘  │
                                        │         │                           │
                                        │         ▼                           │
                                        │  D1 Database (asset metadata)       │
                                        └─────────────────────────────────────┘
```

---

## Files to Create

### 1. `api/src/ai/scenario-types.ts`
TypeScript interfaces for Scenario.com API.

```typescript
// Configuration
export interface ScenarioConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
}

// Generation Parameters
export interface GenerationParams {
  prompt: string;
  modelId?: string;
  width?: number;
  height?: number;
  numSamples?: number;
  guidance?: number;
  numInferenceSteps?: number;
  negativePrompt?: string;
  seed?: string;
}

export interface ThirdPartyGenerationParams {
  prompt: string;
  modelId: string;
  numSamples?: number;
  aspectRatio?: string;
  seed?: string;
}

export interface Img2ImgParams {
  prompt: string;
  image: string; // asset ID
  strength: number;
  modelId?: string;
  numSamples?: number;
  guidance?: number;
  numInferenceSteps?: number;
  seed?: string;
}

// API Responses
export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface JobResponse {
  job: {
    jobId: string;
    status: JobStatus;
    progress?: number;
    metadata?: {
      assetIds?: string[];
    };
    error?: string;
  };
}

export interface AssetResponse {
  asset: {
    id: string;
    url: string;
    mimeType?: string;
    width?: number;
    height?: number;
  };
}

// Results
export interface GenerationResult {
  jobId: string;
  assetIds: string[];
  urls: string[];
}
```

### 2. `api/src/ai/scenario.ts`
Core API client (adapted from MCP implementation).

**Key Methods:**
- `constructor(config: ScenarioConfig)` - Initialize with credentials
- `createGenerationJob(params: GenerationParams): Promise<string>` - Start txt2img job
- `createThirdPartyJob(params: ThirdPartyGenerationParams): Promise<string>` - Start custom model job
- `createImg2ImgJob(params: Img2ImgParams): Promise<string>` - Start img2img job
- `createRemoveBackgroundJob(assetId: string): Promise<string>` - Start bg removal
- `pollJobUntilComplete(jobId: string): Promise<string[]>` - Wait for completion
- `getAssetUrl(assetId: string): Promise<string>` - Get download URL
- `downloadAsset(assetId: string): Promise<ArrayBuffer>` - Download image bytes
- `uploadAsset(imageBuffer: ArrayBuffer): Promise<string>` - Upload image, get asset ID
- `usesCustomEndpoint(modelId: string): boolean` - Check if model needs /generate/custom

**Authentication:**
```typescript
private getAuthHeader(): string {
  const credentials = `${this.apiKey}:${this.apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}
```

**Polling Configuration:**
- `POLL_INTERVAL_MS = 3000` (3 seconds)
- `MAX_POLL_ATTEMPTS = 200` (10 minutes max)

### 3. `api/src/ai/assets.ts`
High-level asset generation service.

**Interfaces:**
```typescript
export type EntityType = 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui';
export type SpriteStyle = 'pixel' | 'cartoon' | '3d' | 'flat';

export interface AssetGenerationRequest {
  entityType: EntityType;
  description: string;
  style: SpriteStyle;
  size?: { width: number; height: number };
  animated?: boolean;
  frameCount?: number;
  seed?: string;
}

export interface AssetGenerationResult {
  success: boolean;
  assetUrl?: string;
  r2Key?: string;
  frames?: string[]; // For animated sprites
  error?: string;
}
```

**Key Methods:**
- `generateAsset(request: AssetGenerationRequest): Promise<AssetGenerationResult>`
- `selectModel(entityType: EntityType, style: SpriteStyle, animated: boolean): string`
- `buildPrompt(entityType: EntityType, description: string, style: SpriteStyle): string`

**Model Selection Matrix:**
```typescript
const MODEL_MATRIX: Record<string, string> = {
  // Pixel art
  'character:pixel:static': 'model_retrodiffusion-plus',
  'character:pixel:animated': 'model_retrodiffusion-animation',
  'enemy:pixel:static': 'model_retrodiffusion-plus',
  'enemy:pixel:animated': 'model_retrodiffusion-animation',
  'item:pixel:static': 'model_retrodiffusion-plus',
  'platform:pixel:static': 'model_retrodiffusion-tile',
  'background:pixel:static': 'model_uM7q4Ms6Y5X2PXie6oA9ygRa', // Environment Sprites 2.0
  
  // Cartoon
  'character:cartoon:static': 'model_c8zak5M1VGboxeMd8kJBr2fn', // Cartoon Characters 2.0
  'background:cartoon:static': 'model_hHuMquQ1QvEGHS1w7tGuYXud', // Cartoon Backgrounds 2.0
  
  // UI
  'ui:*:static': 'model_mcYj5uGzXteUw6tKapsaDgBP', // Game UI Essentials 2.0
  
  // 3D Icons
  'item:3d:static': 'model_7v2vV6NRvm8i8jJm6DWHf6DM', // 3D Icons
};
```

**Prompt Templates:**
```typescript
const PROMPT_TEMPLATES: Record<EntityType, string> = {
  character: 'pixel art {DESCRIPTION} character, {STYLE}-bit style, side view, {DETAILS}, transparent background, game sprite, clean edges',
  enemy: 'pixel art {DESCRIPTION} enemy character, {STYLE}-bit style, side view, menacing appearance, transparent background, game sprite',
  item: 'pixel art {DESCRIPTION} icon, {STYLE}-bit style, centered, transparent background, game item, simple design',
  platform: 'pixel art {DESCRIPTION} tile, {STYLE}-bit style, top-down view, tileable seamless pattern, game tileset, no border artifacts',
  background: 'pixel art {DESCRIPTION} scene, {STYLE}-bit style, game background, parallax-ready',
  ui: 'game UI {DESCRIPTION}, clean design, {STYLE} style, transparent background',
};
```

---

## Files to Modify

### 1. `api/wrangler.toml`
Enable R2 bucket:

```toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "clover-assets"
```

### 2. `api/src/trpc/context.ts`
Add R2 bucket type to Env:

```typescript
export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket; // ADD THIS
  SCENARIO_API_KEY: string;
  SCENARIO_SECRET_API_KEY: string;
  // ... existing env vars
}
```

### 3. `api/src/trpc/router.ts`
Add assets router:

```typescript
const assetsRouter = router({
  generate: installedProcedure
    .input(z.object({
      entityType: z.enum(['character', 'enemy', 'item', 'platform', 'background', 'ui']),
      description: z.string().min(3).max(200),
      style: z.enum(['pixel', 'cartoon', '3d', 'flat']).default('pixel'),
      size: z.object({
        width: z.number().min(32).max(1024),
        height: z.number().min(32).max(1024),
      }).optional(),
      animated: z.boolean().default(false),
      frameCount: z.number().min(2).max(12).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assetService = new AssetService(ctx.env);
      return assetService.generateAsset(input);
    }),

  generateBatch: installedProcedure
    .input(z.object({
      assets: z.array(/* same schema as above */).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const assetService = new AssetService(ctx.env);
      return Promise.all(input.assets.map(a => assetService.generateAsset(a)));
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const object = await ctx.env.ASSETS.get(input.key);
      if (!object) throw new TRPCError({ code: 'NOT_FOUND' });
      return { url: `https://assets.clover.app/${input.key}` };
    }),
});

// Add to appRouter
export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assets: assetsRouter, // ADD THIS
  health: publicProcedure.query(() => ({ status: 'ok', timestamp: Date.now() })),
});
```

---

## Database Schema Addition

Add assets table to track generated assets:

```sql
-- api/migrations/0002_assets.sql
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  install_id TEXT,
  entity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  style TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  scenario_job_id TEXT,
  scenario_asset_id TEXT,
  width INTEGER,
  height INTEGER,
  is_animated INTEGER DEFAULT 0,
  frame_count INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_assets_user ON assets(user_id);
CREATE INDEX idx_assets_install ON assets(install_id);
CREATE INDEX idx_assets_type ON assets(entity_type);
```

---

## R2 Storage Strategy

**Bucket**: `clover-assets`

**Key Format**: `{userId|installId}/{assetId}.{ext}`
- Example: `user_abc123/asset_xyz789.png`
- Example: `install_def456/asset_uvw012.webp`

**Public Access**: Configure R2 bucket with custom domain `assets.clover.app`

**CDN URL Pattern**: `https://assets.clover.app/{r2_key}`

---

## Environment Variables Required

```env
SCENARIO_API_KEY=api_xxxxx
SCENARIO_SECRET_API_KEY=secret_xxxxx
```

Add to `wrangler.toml`:
```toml
[vars]
# Set via wrangler secret put
# SCENARIO_API_KEY
# SCENARIO_SECRET_API_KEY
```

---

## Error Handling Strategy

1. **API Errors**: Catch Scenario.com errors, extract message, return user-friendly error
2. **Timeout**: If polling exceeds 10 minutes, return timeout error
3. **R2 Failures**: Retry upload 3 times before failing
4. **Fallback**: Return colored placeholder shape if generation fails

```typescript
const FALLBACK_COLORS: Record<EntityType, string> = {
  character: '#4CAF50', // Green
  enemy: '#F44336',     // Red
  item: '#FFD700',      // Gold
  platform: '#8B4513',  // Brown
  background: '#87CEEB', // Sky blue
  ui: '#9E9E9E',        // Gray
};
```

---

## Testing Plan

### Unit Tests
1. `scenario.test.ts` - Mock API calls, verify polling logic
2. `assets.test.ts` - Verify model selection, prompt building

### Integration Tests
1. Generate static character sprite
2. Generate animated walk cycle
3. Generate seamless tile
4. Remove background from uploaded image
5. Batch generate multiple assets

### Manual Testing
Use MCP tools to verify models before integration:
```typescript
// Test Retro Diffusion Plus
mcp_scenario-image-gen_generate_image({
  prompt: "pixel art knight character, 16-bit style, side view, silver armor",
  model_id: "model_retrodiffusion-plus",
  output_path: "/tmp/test-knight.png"
});
```

---

## Implementation Order

1. **Phase 1: Core Client** (this session)
   - [ ] Create `api/src/ai/scenario-types.ts`
   - [ ] Create `api/src/ai/scenario.ts`
   - [ ] Add env types to context

2. **Phase 2: Asset Service** (this session)
   - [ ] Create `api/src/ai/assets.ts`
   - [ ] Implement model selection
   - [ ] Implement prompt building

3. **Phase 3: R2 Integration** (this session)
   - [ ] Enable R2 in wrangler.toml
   - [ ] Implement R2 upload in asset service
   - [ ] Create database migration for assets table

4. **Phase 4: tRPC Routes** (this session)
   - [ ] Add assets router to tRPC
   - [ ] Implement generate mutation
   - [ ] Implement batch generate mutation

5. **Phase 5: Testing & Validation**
   - [ ] Test with MCP tools first
   - [ ] Integration test via tRPC
   - [ ] Verify frontend ImageRenderer works

---

## Success Criteria

- [ ] Can generate a pixel art character sprite via `assets.generate`
- [ ] Sprite is stored in R2 with public URL
- [ ] URL works in frontend `ImageRenderer`
- [ ] Can generate batch of assets for a complete game
- [ ] Error handling returns useful messages
- [ ] Generation completes in < 60 seconds

---

## References

- **MCP Source**: `/Users/hassoncs/Workspaces/Personal/scenario-image-gen/src/scenario-client.ts`
- **API Docs**: `https://docs.scenario.com`
- **Models List**: Use `mcp_scenario-image-gen_list_models` to get current models
- **Existing TODO**: `/docs/game-maker/SCENARIO_API_TODO.md`
- **Sprite Research**: `/docs/game-maker/SPRITE_GENERATION.md`
