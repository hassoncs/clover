# API Design - Social Features

> **tRPC endpoints for sharing, forking, and asset packs**

---

## Overview

This document specifies the new API endpoints needed for social features:
1. **Game Sharing** - Share games via links
2. **Game Forking** - Create copies of shared games
3. **Asset Packs** - Themed asset collections
4. **Game Discovery** - Browse published games

---

## Data Models

### Extended Game Model
```typescript
// Additions to existing games table
interface Game {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  definition: string; // JSON GameDefinition
  
  // NEW: Social fields
  visibility: 'private' | 'unlisted' | 'public';
  shareSlug: string | null;        // Unique URL-friendly slug
  publishedAt: number | null;      // Timestamp when published
  parentGameId: string | null;     // If forked, reference to original
  forkCount: number;               // Number of times forked
  playCount: number;               // Already exists
  likeCount: number;               // Future
  
  // Metadata
  thumbnailUrl: string | null;
  tags: string[];                  // For discovery
  
  createdAt: number;
  updatedAt: number;
}
```

### Asset Pack Model
```typescript
interface AssetPack {
  id: string;
  name: string;
  description: string | null;
  style: 'pixel' | 'cartoon' | '3d' | 'flat';
  
  // Pack contents
  assets: Record<string, AssetConfig>;
  parallaxLayers?: ParallaxLayer[];
  
  // Metadata
  thumbnailUrl: string | null;
  creatorId: string | null;        // null = system pack
  isOfficial: boolean;
  downloadCount: number;
  
  createdAt: number;
  updatedAt: number;
}

interface AssetConfig {
  imageUrl: string;
  entityType: 'player' | 'enemy' | 'platform' | 'projectile' | 'collectible' | 'obstacle' | 'decoration';
  promptUsed?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}
```

---

## API Endpoints

### Games Router Extensions

#### `games.publish`
Publish a game to make it publicly visible.

```typescript
games.publish = installedProcedure
  .input(z.object({
    id: z.string(),
    visibility: z.enum(['unlisted', 'public']).default('public'),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify ownership
    const game = await getGame(input.id);
    if (game.userId !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    
    // 2. Generate share slug if not exists
    const shareSlug = game.shareSlug ?? generateSlug(game.title);
    
    // 3. Generate thumbnail if not exists
    const thumbnailUrl = game.thumbnailUrl ?? await generateThumbnail(game);
    
    // 4. Update game
    await updateGame(input.id, {
      visibility: input.visibility,
      shareSlug,
      thumbnailUrl,
      publishedAt: Date.now(),
    });
    
    return {
      success: true,
      shareUrl: `https://slopcade.com/play/${shareSlug}`,
      shareSlug,
    };
  });
```

#### `games.unpublish`
Make a game private again.

```typescript
games.unpublish = installedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await verifyOwnership(input.id, ctx.userId);
    await updateGame(input.id, {
      visibility: 'private',
      publishedAt: null,
    });
    return { success: true };
  });
```

#### `games.getBySlug`
Load a game by its share slug (for playing shared games).

```typescript
games.getBySlug = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input }) => {
    const game = await getGameBySlug(input.slug);
    
    if (!game) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    
    if (game.visibility === 'private') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    
    // Increment play count
    await incrementPlayCount(game.id);
    
    return {
      id: game.id,
      title: game.title,
      description: game.description,
      definition: game.definition,
      authorName: game.authorName, // Anonymized or display name
      forkCount: game.forkCount,
      playCount: game.playCount,
      canFork: true,
    };
  });
```

#### `games.fork`
Create a copy of a shared game.

```typescript
games.fork = installedProcedure
  .input(z.object({
    gameId: z.string(),
    // Optional: override title
    title: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Get source game
    const source = await getGame(input.gameId);
    
    // 2. Verify it's forkable (public or unlisted)
    if (source.visibility === 'private' && source.userId !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot fork private game' });
    }
    
    // 3. Parse and modify definition
    const definition = JSON.parse(source.definition) as GameDefinition;
    definition.metadata.id = generateId();
    definition.metadata.title = input.title ?? `${source.title} (Remix)`;
    definition.metadata.author = ctx.userId;
    definition.metadata.createdAt = Date.now();
    
    // 4. Create new game
    const newGame = await createGame({
      userId: ctx.userId,
      title: definition.metadata.title,
      description: `Remixed from "${source.title}"`,
      definition: JSON.stringify(definition),
      visibility: 'private',
      parentGameId: input.gameId,
    });
    
    // 5. Increment fork count on source
    await incrementForkCount(input.gameId);
    
    return {
      success: true,
      gameId: newGame.id,
      title: definition.metadata.title,
    };
  });
```

#### `games.getFeed`
Get published games for discovery.

```typescript
games.getFeed = publicProcedure
  .input(z.object({
    cursor: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
    sort: z.enum(['recent', 'popular', 'trending']).default('recent'),
    tags: z.array(z.string()).optional(),
  }))
  .query(async ({ input }) => {
    const games = await queryPublicGames({
      cursor: input.cursor,
      limit: input.limit,
      sort: input.sort,
      tags: input.tags,
    });
    
    return {
      games: games.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        thumbnailUrl: g.thumbnailUrl,
        authorName: g.authorName,
        playCount: g.playCount,
        forkCount: g.forkCount,
        tags: g.tags,
        publishedAt: g.publishedAt,
      })),
      nextCursor: games.length === input.limit ? games[games.length - 1].id : null,
    };
  });
```

#### `games.getForkedFrom`
Get the lineage of a game (if forked).

```typescript
games.getForkedFrom = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const game = await getGame(input.id);
    if (!game.parentGameId) return null;
    
    const parent = await getGame(game.parentGameId);
    return {
      id: parent.id,
      title: parent.title,
      authorName: parent.authorName,
      shareSlug: parent.shareSlug,
    };
  });
```

---

### Asset Packs Router

New router: `api/src/trpc/routes/assetPacks.ts`

#### `assetPacks.list`
Browse available asset packs.

```typescript
assetPacks.list = publicProcedure
  .input(z.object({
    style: z.enum(['pixel', 'cartoon', '3d', 'flat']).optional(),
    official: z.boolean().optional(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
  }))
  .query(async ({ input }) => {
    const packs = await queryAssetPacks({
      style: input.style,
      official: input.official,
      cursor: input.cursor,
      limit: input.limit,
    });
    
    return {
      packs: packs.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        style: p.style,
        thumbnailUrl: p.thumbnailUrl,
        assetCount: Object.keys(p.assets).length,
        isOfficial: p.isOfficial,
        downloadCount: p.downloadCount,
      })),
      nextCursor: packs.length === input.limit ? packs[packs.length - 1].id : null,
    };
  });
```

#### `assetPacks.get`
Get full asset pack details.

```typescript
assetPacks.get = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const pack = await getAssetPack(input.id);
    if (!pack) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    
    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      style: pack.style,
      assets: pack.assets,
      parallaxLayers: pack.parallaxLayers,
      thumbnailUrl: pack.thumbnailUrl,
      isOfficial: pack.isOfficial,
    };
  });
```

#### `assetPacks.applyToGame`
Apply an asset pack to a game.

```typescript
assetPacks.applyToGame = installedProcedure
  .input(z.object({
    gameId: z.string(),
    packId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify game ownership
    await verifyOwnership(input.gameId, ctx.userId);
    
    // 2. Get pack
    const pack = await getAssetPack(input.packId);
    if (!pack) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
    }
    
    // 3. Get game definition
    const game = await getGame(input.gameId);
    const definition = JSON.parse(game.definition) as GameDefinition;
    
    // 4. Add pack to game
    if (!definition.assetPacks) {
      definition.assetPacks = {};
    }
    definition.assetPacks[pack.id] = {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      style: pack.style,
      assets: pack.assets,
    };
    definition.activeAssetPackId = pack.id;
    
    // 5. Add parallax if present
    if (pack.parallaxLayers) {
      definition.parallaxConfig = {
        enabled: true,
        layers: pack.parallaxLayers,
      };
    }
    
    // 6. Save
    await updateGame(input.gameId, {
      definition: JSON.stringify(definition),
    });
    
    // 7. Increment download count
    await incrementPackDownloads(input.packId);
    
    return { success: true };
  });
```

---

## Database Schema Updates

### D1 SQL Migrations

```sql
-- Migration: Add social fields to games table
ALTER TABLE games ADD COLUMN visibility TEXT DEFAULT 'private';
ALTER TABLE games ADD COLUMN share_slug TEXT UNIQUE;
ALTER TABLE games ADD COLUMN published_at INTEGER;
ALTER TABLE games ADD COLUMN parent_game_id TEXT REFERENCES games(id);
ALTER TABLE games ADD COLUMN fork_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN thumbnail_url TEXT;
ALTER TABLE games ADD COLUMN tags TEXT; -- JSON array

CREATE INDEX idx_games_visibility ON games(visibility);
CREATE INDEX idx_games_share_slug ON games(share_slug);
CREATE INDEX idx_games_published_at ON games(published_at);
CREATE INDEX idx_games_parent ON games(parent_game_id);

-- Asset packs table
CREATE TABLE asset_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,
  assets TEXT NOT NULL, -- JSON
  parallax_layers TEXT, -- JSON
  thumbnail_url TEXT,
  creator_id TEXT REFERENCES users(id),
  is_official INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_asset_packs_style ON asset_packs(style);
CREATE INDEX idx_asset_packs_official ON asset_packs(is_official);
```

---

## URL Structure

### Sharing URLs
```
https://slopcade.com/play/{shareSlug}    # Play shared game
https://slopcade.com/edit/{gameId}       # Edit own game
https://slopcade.com/discover            # Browse games
https://slopcade.com/packs               # Browse asset packs
https://slopcade.com/u/{username}        # User profile (future)
```

### Deep Links (Mobile)
```
slopcade://play/{shareSlug}
slopcade://edit/{gameId}
slopcade://fork/{shareSlug}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| games.fork | 10 | per hour |
| games.publish | 5 | per hour |
| assetPacks.applyToGame | 20 | per hour |
| games.getFeed | 100 | per minute |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `GAME_NOT_FOUND` | Game doesn't exist |
| `PACK_NOT_FOUND` | Asset pack doesn't exist |
| `NOT_FORKABLE` | Game is private and not owned by user |
| `ALREADY_PUBLISHED` | Game is already public |
| `SLUG_TAKEN` | Share slug already in use |
| `RATE_LIMITED` | Too many requests |

---

## Seeded Asset Packs

Initial official asset packs to ship with:

```typescript
const OFFICIAL_PACKS = [
  {
    id: 'pixel-adventure',
    name: 'Pixel Adventure',
    style: 'pixel',
    description: 'Classic 8-bit style characters and props',
    assets: {
      player: { imageUrl: '...', entityType: 'player' },
      enemy: { imageUrl: '...', entityType: 'enemy' },
      platform: { imageUrl: '...', entityType: 'platform' },
      // ...
    },
  },
  {
    id: 'cartoon-animals',
    name: 'Cartoon Animals',
    style: 'cartoon',
    description: 'Cute cartoon animals for kids',
    // ...
  },
  {
    id: 'space-station',
    name: 'Space Station',
    style: '3d',
    description: 'Sci-fi themed space assets',
    // ...
  },
  {
    id: 'flat-minimalist',
    name: 'Flat Minimalist',
    style: 'flat',
    description: 'Clean geometric shapes',
    // ...
  },
];
```

---

## Client Integration

### React Hook for Social Features
```typescript
// app/lib/hooks/useSocialFeatures.ts

export function useSocialFeatures(gameId: string) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const publish = async (visibility: 'unlisted' | 'public' = 'public') => {
    setIsPublishing(true);
    try {
      const result = await trpc.games.publish.mutate({ id: gameId, visibility });
      setShareUrl(result.shareUrl);
      return result;
    } finally {
      setIsPublishing(false);
    }
  };
  
  const fork = async (title?: string) => {
    const result = await trpc.games.fork.mutate({ gameId, title });
    return result;
  };
  
  const copyShareLink = async () => {
    if (shareUrl) {
      await Clipboard.setStringAsync(shareUrl);
      // Show toast
    }
  };
  
  return {
    shareUrl,
    isPublishing,
    publish,
    fork,
    copyShareLink,
  };
}
```
