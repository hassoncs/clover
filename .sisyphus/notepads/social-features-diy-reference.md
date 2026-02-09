# Social Features DIY Reference

What it takes to build TikTok-style social features from scratch on Cloudflare Workers + D1 (SQLite). This is a reference for understanding scope if we ever port away from Stream.

---

## 1. Comments & Replies

**Complexity: Medium**

### Data Model

```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT,            -- NULL for top-level, comment ID for replies
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,        -- soft delete
  reply_count INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

CREATE INDEX idx_comments_game ON comments(game_id, created_at);
CREATE INDEX idx_comments_parent ON comments(parent_id, created_at);
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/games/:id/comments?cursor=&limit=` | Top-level comments (paginated) |
| GET | `/comments/:id/replies?cursor=&limit=` | Replies to a comment |
| POST | `/games/:id/comments` | Create comment |
| POST | `/comments/:id/replies` | Reply to comment |
| PUT | `/comments/:id` | Edit comment |
| DELETE | `/comments/:id` | Soft delete |

### Gotchas

- **Depth limiting**: Cap nesting at 2 levels (comment -> reply). Deeper threads get confusing on mobile and the queries get ugly. TikTok only does 1 level deep.
- **Counting replies**: Maintain `reply_count` via triggers or application code. Don't COUNT(*) on every read.
- **Pagination**: Use cursor-based (keyset) pagination, not OFFSET. D1 handles this fine but OFFSET degrades at scale.
- **Soft deletes**: Keep the row so reply threads don't break. Show "deleted" placeholder in UI.

---

## 2. Rich Comments (Images, Mentions, @-links)

**Complexity: Medium**

### Data Model

```sql
-- Mentions extracted from comment body, stored separately for notifications
CREATE TABLE comment_mentions (
  comment_id TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL,
  PRIMARY KEY (comment_id, mentioned_user_id)
);

-- Images attached to comments (stored in R2)
CREATE TABLE comment_attachments (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  type TEXT NOT NULL,         -- 'image', 'gif'
  url TEXT NOT NULL,          -- R2 public URL
  width INTEGER,
  height INTEGER
);
```

### Approach

- Store comment body as plain text with `@username` tokens. Parse mentions on write, insert into `comment_mentions`, and fire notifications.
- On read, the client resolves `@username` tokens into tappable links using a regex pass.
- Images upload to **R2** first (presigned URL or direct worker upload), then attach the R2 URL to the comment. Limit to 1 image per comment to keep it simple.
- For GIFs, integrate a Giphy/Tenor picker client-side. Store the external URL directly (no need to proxy through R2).

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads/presign` | Get presigned R2 upload URL |
| GET | `/users/search?q=` | Autocomplete for @-mentions |

### Gotchas

- **Mention validation**: Verify mentioned users exist at write time. Don't let people @-mention nonexistent users.
- **Image moderation**: You need some form of content moderation on uploaded images. Cloudflare has an Images product with built-in moderation, or use a third-party API.
- **R2 costs**: Negligible for images at moderate scale. R2 has no egress fees.
- **Body size limit**: Cap comment body at ~2000 chars. Enforce server-side.

---

## 3. Reactions / Likes

**Complexity: Simple**

### Data Model

```sql
CREATE TABLE reactions (
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'game' or 'comment'
  target_id TEXT NOT NULL,
  reaction TEXT NOT NULL,     -- 'like', 'fire', 'laugh', etc.
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);

-- Denormalized counts on the target tables
-- Add to games table: like_count INTEGER DEFAULT 0
-- Add to comments table: like_count INTEGER DEFAULT 0
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reactions` | Add reaction (body: target_type, target_id, reaction) |
| DELETE | `/reactions/:target_type/:target_id` | Remove reaction |
| GET | `/reactions/:target_type/:target_id` | Get reaction counts + current user's reaction |

### Approach

- One reaction per user per target (the PK enforces this). Use `INSERT OR REPLACE` for idempotency.
- Keep denormalized counts on the parent row. Update via `UPDATE games SET like_count = like_count + 1` in the same transaction as the reaction insert.
- If you want multiple reaction types (like, fire, laugh), the PK still works -- one reaction type per user per target. Changing reaction type is an upsert.

### Gotchas

- **Race conditions**: D1 transactions handle concurrent count updates correctly within a single DO, but if you scale across multiple D1 databases you'll need to reconcile.
- **Batch reads**: When loading a feed, you need to know "did I like this?" for each item. Batch query: `SELECT target_id FROM reactions WHERE user_id = ? AND target_type = 'game' AND target_id IN (?, ?, ...)`.
- **Count accuracy**: Denormalized counts can drift. Have a background job that periodically reconciles `like_count` with `COUNT(*) FROM reactions`.

---

## 4. Follow System

**Complexity: Simple-Medium**

### Data Model

```sql
CREATE TABLE follows (
  follower_id TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'user' or 'game'
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, target_type, target_id)
);

CREATE INDEX idx_follows_target ON follows(target_type, target_id);

-- Denormalized counts
-- users table: follower_count, following_count
-- games table: follower_count
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/follows` | Follow a user or game |
| DELETE | `/follows/:target_type/:target_id` | Unfollow |
| GET | `/users/:id/followers?cursor=` | List followers |
| GET | `/users/:id/following?cursor=` | List who they follow |
| GET | `/follows/check?targets=` | Batch check follow status |

### Gotchas

- **Fan-out on follow**: When a user follows someone, you may want to backfill their feed with recent posts from that user. This is where it starts getting complex (see Feed Algorithm section).
- **Block/mute**: You'll eventually need a `blocks` table. Check it on follow attempts and filter it from follower lists.
- **Counts at scale**: Same denormalized count pattern as reactions. Same drift risk.

---

## 5. Direct Messaging

**Complexity: Hard**

### Data Model

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,          -- 'direct' or 'group'
  name TEXT,                   -- NULL for 1:1, group name for groups
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL  -- bumped on each new message
);

CREATE TABLE conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  last_read_at INTEGER,        -- for unread counts
  muted_until INTEGER,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members(user_id);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'text',    -- 'text', 'image', 'system'
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations?cursor=` | List user's conversations (sorted by updated_at) |
| POST | `/conversations` | Create conversation (1:1 or group) |
| GET | `/conversations/:id/messages?cursor=` | Get messages (paginated, newest first) |
| POST | `/conversations/:id/messages` | Send message |
| PUT | `/conversations/:id/read` | Mark as read (update last_read_at) |
| POST | `/conversations/:id/members` | Add member to group |
| DELETE | `/conversations/:id/members/:user_id` | Remove member |

### Real-time Delivery

This is the hard part. Options on Cloudflare:

1. **Durable Objects + WebSockets**: Each conversation gets a Durable Object. Clients connect via WebSocket. The DO broadcasts messages to all connected members. This is the Cloudflare-native approach and works well.
2. **Polling**: Simple but bad UX. 3-5 second polling interval. Only viable for MVP.
3. **Server-Sent Events (SSE)**: Workers support SSE. Simpler than WebSockets but one-directional. Can work if sends still go through REST.

Recommendation: **Durable Objects + WebSockets** for production. Polling for MVP.

### Gotchas

- **1:1 deduplication**: Before creating a direct conversation, check if one already exists between the two users. Use a canonical key like `min(user1, user2) + max(user1, user2)`.
- **Unread counts**: Computed as `COUNT(*) FROM messages WHERE conversation_id = ? AND created_at > last_read_at`. Cache this aggressively or denormalize.
- **Message ordering**: Use server timestamps, not client timestamps. Generate IDs with time-sortable format (ULIDs work well).
- **Rate limiting**: Essential. Users will spam. Limit messages per minute per user.
- **E2E encryption**: Not worth building for a gaming social app. Standard TLS is fine.
- **Durable Object cost**: Each active conversation DO costs money. Idle DOs are free. At moderate scale this is very affordable.

---

## 6. Notifications

**Complexity: Medium-Hard**

### Data Model

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'like', 'comment', 'follow', 'mention', 'message'
  actor_id TEXT NOT NULL,       -- who triggered it
  target_type TEXT,             -- 'game', 'comment', etc.
  target_id TEXT,
  body TEXT,                    -- pre-rendered notification text
  read_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY,
  push_enabled INTEGER DEFAULT 1,
  push_likes INTEGER DEFAULT 1,
  push_comments INTEGER DEFAULT 1,
  push_follows INTEGER DEFAULT 1,
  push_messages INTEGER DEFAULT 1
);

CREATE TABLE push_tokens (
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,      -- 'ios', 'android', 'web'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, token)
);
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications?cursor=` | List notifications |
| PUT | `/notifications/read` | Mark all as read |
| PUT | `/notifications/:id/read` | Mark one as read |
| GET | `/notifications/unread-count` | Badge count |
| PUT | `/notification-preferences` | Update preferences |
| POST | `/push-tokens` | Register push token |
| DELETE | `/push-tokens/:token` | Unregister |

### Push Notification Delivery

- **Expo Push**: If using Expo, use `expo-notifications` and Expo's push service. Send to Expo's push API from the worker. This handles APNs/FCM routing for you.
- **Direct APNs/FCM**: More control but more work. Need to handle token refresh, error codes, and per-platform payloads.
- **Web Push**: Use the Web Push API. Store subscription objects instead of tokens.

### Architecture

Notifications should be produced asynchronously. When someone likes a game:

1. The like endpoint writes the reaction to D1.
2. It puts a message on a **Queue** (Cloudflare Queues): `{ type: 'like', actor: 'user1', target: 'game1', owner: 'user2' }`.
3. A queue consumer worker: checks preferences, deduplicates (don't send 50 separate "X liked your game" pushes), writes to the notifications table, and sends the push.

### Gotchas

- **Notification grouping**: "Alice and 4 others liked your game" -- batch similar notifications. This requires either a grouping query on read or pre-aggregating in the queue consumer.
- **Self-notifications**: Never notify users about their own actions.
- **Delivery guarantees**: Queues provide at-least-once delivery. Make notification creation idempotent (use a deterministic ID based on type + actor + target + time window).
- **Token hygiene**: APNs/FCM will tell you when tokens are invalid. Handle these errors and clean up stale tokens.
- **Rate limiting notifications**: Don't send push for every single like on a viral game. Batch and throttle.

---

## 7. Feed Algorithm

**Complexity: Hard**

### Data Model

```sql
-- The feed is a materialized view of content the user should see
CREATE TABLE feed_items (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score REAL NOT NULL,         -- ranking score
  reason TEXT NOT NULL,         -- 'following', 'trending', 'recommended'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX idx_feed_user ON feed_items(user_id, score DESC);

-- Track what users have seen (for deduplication and signal)
CREATE TABLE feed_impressions (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  impressed_at INTEGER NOT NULL,
  engaged INTEGER DEFAULT 0,   -- did they tap/play?
  PRIMARY KEY (user_id, game_id)
);

-- Engagement signals for scoring
CREATE TABLE engagement_signals (
  game_id TEXT NOT NULL,
  period TEXT NOT NULL,         -- '2024-01-15', 'week:2024-03', etc.
  views INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  avg_play_duration REAL,
  PRIMARY KEY (game_id, period)
);
```

### Two Approaches

**Approach A: Simple chronological + trending (recommended for MVP)**

No per-user feed table needed. Just two queries:

1. **Following feed**: `SELECT games.* FROM games JOIN follows ON ... ORDER BY created_at DESC`
2. **Trending feed**: Score = `(likes + comments*2 + plays*3) / (hours_since_publish ^ 1.5)`. Compute periodically and cache.

Blend them: show 30% following, 70% trending. Filter out already-seen items.

**Approach B: Personalized "For You" feed (production)**

Fan-out-on-write: When a game is published, push it into the `feed_items` table for all followers. Augment with trending/recommended items. Score based on:

- Recency
- Creator engagement rate
- User's past engagement with this creator
- Category/tag affinity
- Completion rate of the game

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed?cursor=&type=` | Get feed (type: for_you, following, trending) |
| POST | `/feed/impression` | Log that user saw an item |
| POST | `/feed/engage` | Log engagement (play, share) |
| GET | `/feed/refresh` | Force refresh / pull-to-refresh |

### Gotchas

- **Fan-out cost**: If a user has 100K followers and publishes a game, you need to write 100K rows. This is why TikTok uses fan-out-on-read for large creators and fan-out-on-write for small creators (hybrid approach). On D1, fan-out-on-write will hit limits quickly. **Start with fan-out-on-read (Approach A).**
- **D1 limitations**: D1 has a 10MB database size limit on the free plan and query limits. A per-user feed table will blow past this fast. Use D1 for the core data and compute feeds on-read with caching.
- **Cold start**: New users have no signals. Show trending content until you have enough engagement data.
- **Stale feeds**: Cache feed responses in Workers KV or cache API. Invalidate on new follows or new content from followed users.
- **Scroll position**: Client should track scroll position and send `cursor` (last seen item) on next request. Don't use offsets.

---

## Infrastructure Summary

| Cloudflare Product | Used For |
|--------------------|----------|
| **Workers** | API endpoints, business logic |
| **D1** | Primary database (all tables above) |
| **R2** | Image/attachment storage |
| **Durable Objects** | Real-time messaging (WebSocket per conversation) |
| **Queues** | Async notification processing, feed updates |
| **KV** | Feed caching, session data, rate limit counters |
| **Workers Analytics Engine** | Engagement tracking at scale (alternative to D1 for high-write analytics) |

## Estimated Build Effort

| Feature | Complexity | Estimated Effort |
|---------|-----------|-----------------|
| Comments & Replies | Medium | 1-2 weeks |
| Rich Comments | Medium | 1 week |
| Reactions/Likes | Simple | 2-3 days |
| Follow System | Simple-Medium | 3-5 days |
| Direct Messaging | Hard | 3-4 weeks |
| Notifications | Medium-Hard | 2-3 weeks |
| Feed Algorithm | Hard | 3-5 weeks |
| **Total** | | **~12-18 weeks** |

This assumes one engineer, production-quality code with tests, and a reasonable MVP scope. The hard parts are real-time messaging and the feed algorithm. Everything else is standard CRUD with some denormalization.

## When to DIY vs. Use a Service

**Use a service (Stream, Sendbird, etc.) when:**
- You need to ship in weeks, not months
- Real-time features (chat, live updates) are core to the experience
- You don't want to maintain WebSocket infrastructure

**Build it yourself when:**
- Cost of the service exceeds 2-3 engineers' time
- You need deep customization the service doesn't support
- You're hitting rate limits or API constraints
- You want full control over the data and user experience
