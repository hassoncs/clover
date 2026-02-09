# Social Features: Backend Wiring Remaining

**Status:** Roadmap - requires API/database work
**Priority:** Medium
**Created:** 2026-02-09

## Context

The social UI is fully built and wired up on the frontend. The following items require backend/database changes to become fully functional.

## 1. Notification Triggers on Social Actions

**What:** Social mutations (likes, comments, follows, ratings) should create notification records so the notifications page has real data.

**Where to change:** `api/src/trpc/routes/social.ts` — each mutation handler

**Mutations that need notification creation:**
- `addReaction` (like) → notify game creator: "{actor} liked your game"
- `addComment` → notify game creator: "{actor} commented on your game"
- `addComment` with `parentId` → notify parent comment author: "{actor} replied to your comment"
- `follow` → notify target user: "{actor} started following you"
- `rateGame` → notify game creator: "{actor} rated your game"

**Pattern:** Fire-and-forget — call `NotificationService.createNotification()` after the main mutation succeeds. The service already skips self-notifications.

```typescript
// Example in addReaction handler, after the insert:
const notifSvc = new NotificationService(ctx.env.DB);
notifSvc.createNotification({
  userId: gameCreatorId, // need to look up the game's creator
  type: 'like',
  actorId: userId,
  targetType: 'game',
  targetId: input.targetId,
  gameId: input.targetId,
  message: `liked your game`,
});
```

**Estimated scope:** ~50 lines across social.ts, need to look up game creator ID for game-targeted notifications.

---

## 2. Block Filtering in Feed/Browse Queries

**What:** Games from blocked users should be excluded from the social feed and browse results.

**Where to change:**
- `api/src/trpc/routes/social.ts` → `feed` procedure
- `api/src/trpc/routes/social-extra.ts` → `followingFeed` procedure
- Optionally: `api/src/trpc/routes/games.ts` → `listPublic` procedure

**Pattern:** If the user is authenticated, get their blocked IDs via `BlockService.getBlockedIds()` and add a `WHERE user_id NOT IN (...)` clause to the feed query.

```sql
-- Add to the feed query WHERE clause:
AND g.user_id NOT IN ('blocked-id-1', 'blocked-id-2', ...)
```

**Estimated scope:** ~15 lines per query, plus importing BlockService.

---

## 3. Unread Notification Badge

**What:** Show an unread count badge on the notifications bell icon in the browse header and the profile page notifications button.

**Where to change:**
- `app/app/(tabs)/_layout.tsx` — add a tRPC query for `notifications.unreadCount` and render a badge on the bell icon
- `app/components/navigation/AppFrameHeader.tsx` — may need to support badge props on action icons

**Backend:** Already done — `notifications.unreadCount` endpoint exists.

**Estimated scope:** ~20 lines in the header component.

---

## 4. Real Feed Data (Replace Placeholder)

**What:** The feed currently uses `useBrowseGames` as a placeholder. Swap back to the real `social.feed` tRPC query once games exist in the database with social metadata.

**Where to change:** `app/app/(tabs)/feed.tsx` — replace `useBrowseGames` with `trpcReact.social.feed.useQuery`

**Blocked by:** Having actual games with social data in the database. The feed query joins reactions, bookmarks, follows, and comments — all tables exist and queries are written. Just need real data.

**Estimated scope:** ~30 lines — mostly reverting to the original tRPC-based feed code.

---

## 5. Following Feed Tab

**What:** Re-add the "Following" tab to the feed (was in the original implementation, removed during Gizmo-style rewrite).

**Depends on:** Item 4 (real feed data). Uses `socialExtra.followingFeed` which is already implemented.

**Estimated scope:** ~20 lines — add tab bar back to feed.tsx, toggle between two queries.

---

## Summary

| Item | Backend Work | Frontend Work | Blocked By |
|------|-------------|---------------|------------|
| Notification triggers | ~50 lines in social.ts | None | Nothing |
| Block filtering | ~15 lines per query | None | Nothing |
| Unread badge | None | ~20 lines in header | Nothing |
| Real feed data | None | ~30 lines in feed.tsx | Real game data |
| Following feed tab | None | ~20 lines in feed.tsx | Real feed data |

Total estimated: ~150 lines of changes across 4-5 files. No new tables or migrations needed — all schema is in place.
