# Asset Integration Design: Two-Phase Pipeline

> **Status**: Design Document (Ready for Implementation)  
> **Based On**: Oracle architecture consultation + current codebase analysis  
> **Effort**: Medium (1-2 days implementation)

---

## Design Philosophy

**Core Principle**: Generate a **playable game immediately** with shape sprites, then **enrich asynchronously** with AI-generated assets in parallel.

**Why This Works:**
- ✅ User sees game instantly (no 5-minute wait)
- ✅ Physics/gameplay never depends on asset generation
- ✅ Parallel asset generation (30-60s vs 5+ minutes sequential)
- ✅ Graceful degradation (shapes if assets fail)
- ✅ "Regenerate assets only" without touching gameplay

---

## Two-Phase Workflow

### Phase 1: Generate Playable Game (Synchronous, ~3-5s)

```
User Prompt
    ↓
┌─────────────────────────┐
│ classifyPrompt()        │
│ Extract intent          │
└─────────┬───────────────┘
          │ GameIntent
          ↓
┌─────────────────────────┐
│ LLM (GPT-4o)            │
│ Generate GameDefinition │
│ WITH:                   │
│  - Stable entity sizes  │
│  - Shape sprites        │
│  - AssetRequest[]       │
└─────────┬───────────────┘
          │ GameDefinition + AssetRequest[]
          ↓
┌─────────────────────────┐
│ Return to Client        │
│  game: GameDefinition   │
│  assetJobId: uuid       │
└─────────────────────────┘
```

### Phase 2: Asset Enrichment (Async, ~30-60s)

```
AssetRequest[] from Phase 1
    ↓
┌─────────────────────────┐
│ Deduplicate Requests    │
│ Hash: (category +       │
│        description +    │
│        style + size)    │
└─────────┬───────────────┘
          │ Unique AssetRequest[]
          ↓
┌─────────────────────────┐
│ Check Cache             │
│ (R2 + DB lookup)        │
└─────────┬───────────────┘
          │ Cache hits + misses
          ↓
┌─────────────────────────┐
│ Generate Missing Assets │
│ PARALLEL (4-8 workers)  │
│ via scenario.com        │
└─────────┬───────────────┘
          │ Map<requestId, AssetRef>
          ↓
┌─────────────────────────┐
│ Patch GameDefinition    │
│ sprite: shape→image     │
│ Preserve fallbackSprite │
└─────────┬───────────────┘
          │ Enriched GameDefinition
          ↓
┌─────────────────────────┐
│ Push Update to Client   │
│ (SSE / polling)         │
└─────────────────────────┘
```

---

## Data Model Changes

### 1. Add to `shared/src/types/entity.ts`

```typescript
export type AssetCategory =
  | 'character'
  | 'enemy'
  | 'item'
  | 'platform'
  | 'background'
  | 'ui';

export interface AssetRequest {
  id: string;                      // Stable ID (hash of request params)
  category: AssetCategory;
  description: string;             // "orange tabby cat"
  styleHint?: string;              // "pixel art" (global consistency)
  desiredPixelSize?: {
    width: number;
    height: number;
  };
  priority?: 'critical' | 'normal'; // For staged loading (future)
}

export interface AssetRef {
  assetUrl: string;                 // CDN URL
  scenarioAssetId?: string;         // For regeneration
  pixelSize?: {
    width: number;
    height: number;
  };
}

export interface GameEntity {
  id: string;
  name: string;
  
  // Existing:
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  tags?: string[];
  transform: TransformComponent;
  
  // NEW:
  size: { width: number; height: number };  // Canonical gameplay size (meters)
  assetRequest?: AssetRequest;              // Intent: needs asset generation
  asset?: AssetRef;                         // Fulfillment: generated asset
  fallbackSprite?: SpriteComponent;         // Original shape for failures
}
```

### 2. Extend `api/src/ai/generator.ts` Output

```typescript
export interface GenerationResult {
  success: boolean;
  game: GameDefinition;
  assetRequests: AssetRequest[];   // NEW: extracted from entities
  assetJobId?: string;             // NEW: for async tracking
  intent?: GameIntent;
  validationResult?: ValidationResult;
  retryCount?: number;
}
```

### 3. Add to `api/src/ai/schemas.ts`

```typescript
import { z } from 'zod';

export const AssetRequestSchema = z.object({
  id: z.string(),
  category: z.enum(['character', 'enemy', 'item', 'platform', 'background', 'ui']),
  description: z.string(),
  styleHint: z.string().optional(),
  desiredPixelSize: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  priority: z.enum(['critical', 'normal']).optional(),
});

// Update EntitySchema to include new fields
export const EntitySchema = z.object({
  // ... existing fields
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  assetRequest: AssetRequestSchema.optional(),
  asset: z.object({
    assetUrl: z.string(),
    scenarioAssetId: z.string().optional(),
    pixelSize: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
  }).optional(),
  fallbackSprite: SpriteComponentSchema.optional(),
});
```

---

## Implementation Plan

### Step 1: Update LLM Prompts (api/src/ai/generator.ts)

**Modify `SYSTEM_PROMPT`:**

```typescript
const SYSTEM_PROMPT = `You are a game designer AI...

## NEW REQUIREMENT: Asset Planning

For EVERY entity that should have artwork (not ground/walls):
1. Include explicit "assetRequest" field with:
   - category: character/enemy/item/platform/background/ui
   - description: detailed visual description (e.g., "orange tabby cat with green eyes")
2. Set "size" field with stable dimensions in meters (physics/gameplay size)
3. Set "sprite" to a placeholder shape (rect/circle) matching the size

Example:
{
  "id": "player-cat",
  "size": { "width": 1, "height": 1 },
  "sprite": { "type": "circle", "radius": 0.5, "color": "#FF9800" },
  "assetRequest": {
    "category": "character",
    "description": "orange tabby cat, pixel art style, side view, game sprite",
    "desiredPixelSize": { "width": 256, "height": 256 }
  }
}`;
```

**Update `generateGame()` function:**

```typescript
export async function generateGame(
  prompt: string,
  config: AIConfig,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  // ... existing classification logic
  
  const result = await generateObject({
    model,
    schema: GameDefinitionSchema,
    system: SYSTEM_PROMPT,
    prompt: buildGenerationPrompt(prompt, intent),
  });
  
  const game = result.object as GameDefinition;
  
  // NEW: Extract asset requests from entities
  const assetRequests = extractAssetRequests(game);
  
  // NEW: Create async job if assets needed
  const assetJobId = assetRequests.length > 0
    ? await createAssetEnrichmentJob(game.metadata.id, assetRequests)
    : undefined;
  
  return {
    success: true,
    game,
    assetRequests,
    assetJobId,
    intent,
    validationResult: validateGameDefinition(game),
  };
}

function extractAssetRequests(game: GameDefinition): AssetRequest[] {
  return game.entities
    .filter(entity => entity.assetRequest)
    .map(entity => entity.assetRequest!);
}
```

### Step 2: Asset Enrichment Module (api/src/ai/asset-enrichment.ts)

**NEW FILE:**

```typescript
import { AssetService } from './assets';
import type { AssetRequest, AssetRef, GameDefinition } from '../../shared/src/types';

interface EnrichmentJob {
  id: string;
  gameId: string;
  requests: AssetRequest[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedCount: number;
  totalCount: number;
  results: Map<string, AssetRef>;
  errors: Map<string, string>;
}

export class AssetEnrichmentService {
  private jobs = new Map<string, EnrichmentJob>();
  private assetService: AssetService;
  
  constructor(env: Env) {
    this.assetService = new AssetService(env);
  }
  
  async createJob(gameId: string, requests: AssetRequest[]): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const job: EnrichmentJob = {
      id: jobId,
      gameId,
      requests: this.deduplicateRequests(requests),
      status: 'pending',
      completedCount: 0,
      totalCount: requests.length,
      results: new Map(),
      errors: new Map(),
    };
    
    this.jobs.set(jobId, job);
    
    // Start processing async (don't await)
    this.processJob(jobId).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
      job.status = 'failed';
    });
    
    return jobId;
  }
  
  private deduplicateRequests(requests: AssetRequest[]): AssetRequest[] {
    const seen = new Set<string>();
    return requests.filter(req => {
      if (seen.has(req.id)) return false;
      seen.add(req.id);
      return true;
    });
  }
  
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.status = 'processing';
    
    // Process in parallel with bounded concurrency
    const CONCURRENCY = 4;
    const batches = chunk(job.requests, CONCURRENCY);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(request => this.generateAsset(job, request))
      );
    }
    
    job.status = 'completed';
  }
  
  private async generateAsset(job: EnrichmentJob, request: AssetRequest): Promise<void> {
    try {
      // Check cache first
      const cached = await this.checkCache(request);
      if (cached) {
        job.results.set(request.id, cached);
        job.completedCount++;
        return;
      }
      
      // Generate new asset
      const result = await this.assetService.generateAsset({
        entityType: request.category,
        description: request.description,
        style: request.styleHint ?? 'pixel',
        size: request.desiredPixelSize,
      });
      
      if (result.success && result.assetUrl) {
        const assetRef: AssetRef = {
          assetUrl: result.assetUrl,
          scenarioAssetId: result.scenarioAssetId,
          pixelSize: request.desiredPixelSize,
        };
        
        job.results.set(request.id, assetRef);
        await this.cacheAsset(request, assetRef);
      } else {
        job.errors.set(request.id, result.error ?? 'Unknown error');
      }
    } catch (err) {
      job.errors.set(request.id, err instanceof Error ? err.message : 'Failed');
    } finally {
      job.completedCount++;
    }
  }
  
  async getJobStatus(jobId: string): Promise<EnrichmentJob | null> {
    return this.jobs.get(jobId) ?? null;
  }
  
  async applyAssets(game: GameDefinition, jobId: string): Promise<GameDefinition> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    
    const enriched = { ...game };
    enriched.entities = game.entities.map(entity => {
      if (!entity.assetRequest) return entity;
      
      const assetRef = job.results.get(entity.assetRequest.id);
      if (!assetRef) return entity; // Keep shape sprite
      
      return {
        ...entity,
        asset: assetRef,
        sprite: {
          type: 'image',
          imageUrl: assetRef.assetUrl,
          imageWidth: assetRef.pixelSize?.width ?? entity.size.width * 50,
          imageHeight: assetRef.pixelSize?.height ?? entity.size.height * 50,
        },
        fallbackSprite: entity.sprite, // Preserve original
      };
    });
    
    return enriched;
  }
  
  private async checkCache(request: AssetRequest): Promise<AssetRef | null> {
    // TODO: Implement R2 + DB cache lookup
    return null;
  }
  
  private async cacheAsset(request: AssetRequest, assetRef: AssetRef): Promise<void> {
    // TODO: Implement cache storage
  }
}

function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, (i + 1) * size)
  );
}
```

### Step 3: Update tRPC Routes (api/src/trpc/routes/games.ts)

```typescript
import { AssetEnrichmentService } from '../../ai/asset-enrichment';

export const gamesRouter = router({
  // ... existing routes
  
  generate: installedProcedure
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
      const result = await generateGame(input.prompt, aiConfig);
      
      // NEW: Start asset enrichment if needed
      let assetJobId: string | undefined;
      if (result.assetRequests.length > 0) {
        const enrichmentService = new AssetEnrichmentService(ctx.env);
        assetJobId = await enrichmentService.createJob(
          result.game.metadata.id,
          result.assetRequests
        );
      }
      
      return {
        game: result.game,            // Playable immediately
        assetJobId,                   // For polling
        assetsGenerating: !!assetJobId,
        intent: result.intent,
        validation: /* ... */,
      };
    }),
  
  // NEW: Asset job status endpoint
  getAssetJobStatus: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const enrichmentService = new AssetEnrichmentService(ctx.env);
      const job = await enrichmentService.getJobStatus(input.jobId);
      
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      return {
        status: job.status,
        progress: job.completedCount / job.totalCount,
        completedCount: job.completedCount,
        totalCount: job.totalCount,
        hasErrors: job.errors.size > 0,
      };
    }),
  
  // NEW: Get enriched game with assets
  getEnrichedGame: publicProcedure
    .input(z.object({ gameId: z.string(), jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch original game from DB
      const gameRow = await ctx.env.DB.prepare(
        'SELECT * FROM games WHERE id = ?'
      ).bind(input.gameId).first();
      
      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      const game = JSON.parse(gameRow.definition);
      
      // Apply assets
      const enrichmentService = new AssetEnrichmentService(ctx.env);
      const enriched = await enrichmentService.applyAssets(game, input.jobId);
      
      return { game: enriched };
    }),
});
```

---

## Client Integration Example

```typescript
// Frontend: Generate game and poll for assets
const { game, assetJobId, assetsGenerating } = await trpc.games.generate.mutate({
  prompt: "cat launches balls at blocks"
});

// Render game immediately (with shapes)
renderGame(game);

// Poll for asset updates if generating
if (assetsGenerating && assetJobId) {
  const pollInterval = setInterval(async () => {
    const status = await trpc.games.getAssetJobStatus.query({ jobId: assetJobId });
    
    updateProgressBar(status.progress);
    
    if (status.status === 'completed') {
      clearInterval(pollInterval);
      
      // Fetch enriched game
      const { game: enrichedGame } = await trpc.games.getEnrichedGame.query({
        gameId: game.metadata.id,
        jobId: assetJobId,
      });
      
      // Re-render with assets
      renderGame(enrichedGame);
    }
  }, 2000); // Poll every 2s
}
```

---

## Performance Characteristics

### Sequential (Current, if implemented naively)
```
Entity 1: 30s
Entity 2: 30s
Entity 3: 30s
...
Total: 30s × 10 = 5 minutes ❌
```

### Parallel (This Design)
```
Batch 1 (4 entities): 30s
Batch 2 (4 entities): 30s
Batch 3 (2 entities): 30s
Total: 90s with 4 workers ✅
```

### With Caching
```
"cat" → cache hit (0s)
"ball" → cache hit (0s)
"block" → cache hit (0s)
Total: <1s for common assets ⚡
```

---

## Failure Handling

| Scenario | Behavior |
|----------|----------|
| scenario.com down | Keep shape sprites, mark assets as unavailable |
| Partial failures | Patch successful assets, keep shapes for failed |
| Timeout | Retry once, then fail gracefully with shape |
| Invalid model ID | Log error, fallback to generic model |
| R2 upload fails | Retry upload, keep scenario asset ID for later |

---

## Migration Strategy

### Phase 1: Backend Only (No Breaking Changes)
1. Add new fields to entity types (optional)
2. Implement `AssetEnrichmentService`
3. Update LLM prompts to output `assetRequest`
4. Add new tRPC endpoints
5. **Game generation still works exactly as before** (shapes)

### Phase 2: Enable for New Games
1. Update `/games/generate` to start enrichment jobs
2. Frontend adds polling UI
3. Monitor performance and error rates
4. Iterate on cache strategy

### Phase 3: Backfill Existing Games (Optional)
1. Add "Regenerate with Assets" button to old games
2. Parse entity descriptions from existing games
3. Run enrichment on demand

---

## Testing Plan

### Unit Tests
```typescript
// api/src/ai/__tests__/asset-enrichment.test.ts
describe('AssetEnrichmentService', () => {
  it('deduplicates identical asset requests', () => { });
  it('processes assets in parallel batches', () => { });
  it('handles partial failures gracefully', () => { });
  it('caches generated assets by hash', () => { });
});
```

### Integration Tests
```typescript
// api/src/ai/__tests__/game-with-assets.test.ts
it('generates game with assetRequests', async () => {
  const result = await generateGame('cat vs blocks', config);
  expect(result.assetRequests).toHaveLength(3);
  expect(result.assetRequests[0].category).toBe('character');
});

it('enriches game with real assets', async () => {
  const result = await generateGame('cat vs blocks', config);
  const enriched = await enrichmentService.applyAssets(result.game, jobId);
  expect(enriched.entities[0].sprite.type).toBe('image');
  expect(enriched.entities[0].asset.assetUrl).toContain('assets.clover.app');
});
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to playable | <5s | From prompt to first render |
| Asset enrichment time | <90s | 90th percentile, 10 entities |
| Cache hit rate | >50% | After 100 games generated |
| Failure rate | <5% | Assets that fail to generate |
| User satisfaction | >4/5 | "Do assets match your vision?" |

---

## Future Enhancements

### Short Term (Next Sprint)
- Implement asset cache (R2 + DB)
- Add "Regenerate Assets" button
- Progressive loading (critical assets first)

### Medium Term
- Style consistency (global "pixel art" vs "cartoon" choice)
- Asset variations (multiple options to choose from)
- Animation frame extraction from sprite sheets

### Long Term
- Custom asset upload (bring your own sprites)
- Asset marketplace (share/sell sprite packs)
- Real-time asset streaming via SSE/WebSocket

---

## Questions This Design Answers

- ✅ When to trigger asset generation? → After GameDefinition created, async
- ✅ How to extract asset descriptions? → LLM outputs explicit `assetRequest`
- ✅ How to handle sprite sizing? → Entity `size` is stable, assets scale to fit
- ✅ Parallel vs sequential? → Parallel with bounded concurrency (4-8 workers)
- ✅ Fallback strategy? → Preserve shape sprites as `fallbackSprite`
- ✅ Can users regenerate assets? → Yes, via asset enrichment job API
- ✅ What if only some assets fail? → Patch successful, keep shapes for failed
- ✅ Performance target? → 30-90s for full enrichment (vs 5+ min sequential)

---

## Implementation Checklist

- [ ] Update `shared/src/types/entity.ts` with new fields
- [ ] Update `api/src/ai/schemas.ts` with Zod schemas
- [ ] Modify LLM prompts in `api/src/ai/generator.ts`
- [ ] Create `api/src/ai/asset-enrichment.ts`
- [ ] Update `api/src/trpc/routes/games.ts` endpoints
- [ ] Add unit tests for enrichment service
- [ ] Add integration tests for full workflow
- [ ] Update frontend to poll for assets
- [ ] Deploy and monitor performance
- [ ] Iterate on cache strategy
