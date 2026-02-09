# Remaining Social Features — Implementation Plan

## Current State

We have a working social layer: likes, comments (threaded), ratings, follows, bookmarks, social feed, user profile page, and follow button. All backed by D1/SQLite with tRPC endpoints.

This doc covers everything still missing to reach feature parity with Instagram/TikTok-style social apps.

---

## 1. Profile Editing + User Bio

**Why first:** Users currently can't customize their identity at all. Display name comes from Google OAuth and there's no bio.

### Database Changes

```sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT; -- may already exist, verify
```

The `users` table already has `display_name` and `avatar_url`. We just need to add `bio`.

### Backend

- **`users.updateProfile` mutation** (protectedProcedure)
  - Input: `{ displayName?: string, bio?: string, avatarUrl?: string }`
  - Validate: displayName max 50 chars, bio max 160 chars
  - Updates the `users` table directly

- Update `social.getUserProfile` to return `bio` in the response

### Frontend

- **`app/app/settings/edit-profile.tsx`** — New page
  - Text inputs for display name and bio
  - Avatar placeholder (text initials for now, image upload is a separate feature)
  - Save button → calls `users.updateProfile`
  - Navigate here from profile tab or user profile page

- **Update `app/app/user/[id].tsx`** — Show bio below display name

- **Update profile tab** — Add "Edit Profile" button when viewing own profile

### Schema

- Update `shared/src/schema/users.ts` to add `bio` column to Drizzle schema

---

## 2. Follower / Following List UI

**Why:** The profile page shows follower/following counts but they aren't tappable. Users need to see who follows them and who they follow.

### Backend

Already done — `social.getFollowers` and `social.getFollowing` endpoints exist. They return user IDs. Need to verify they join on the `users` table to return display names and avatars.

- **Verify/update `getFollowers`** — Should return `{ id, displayName, avatarUrl }[]` with pagination
- **Verify/update `getFollowing`** — Same shape

### Frontend

- **`app/app/user/followers.tsx`** — New page
  - Params: `{ userId, tab: 'followers' | 'following' }`
  - Two-tab view at top (Followers / Following)
  - FlatList of user rows: avatar + name + follow button
  - Each row tappable → navigates to `/user/[id]`

- **Update `app/app/user/[id].tsx`** — Make follower/following counts tappable, navigate to followers page

---

## 3. Share Button

**Why:** Users need to be able to share games outside the app. This is table-stakes for virality.

### Frontend Only (no backend needed)

- **Add share button to `SocialFeedCard`** — Paper plane icon in action bar (between play and bookmark)
- **Add share button to game detail page**
- Use React Native's `Share.share()` API:
  ```ts
  Share.share({
    title: game.title,
    message: `Check out "${game.title}" on Slopcade!`,
    url: `https://slopcade.com/game/${game.id}`, // or whatever the web URL is
  })
  ```

### Components

- Update `SocialFeedCard.tsx` — Add share icon to action bar
- Update game detail page — Add share button in header or action area

---

## 4. Following-Only Feed

**Why:** Users who follow creators want to see only their content, not the global feed.

### Backend

- **`social.followingFeed` query** (protectedProcedure)
  - Same shape as `social.feed` but filters to games where `user_id IN (SELECT target_id FROM follows WHERE follower_id = ? AND target_type = 'user')`
  - Same pagination, same social status resolution (likes, bookmarks, follows)

### Frontend

- **Update `feed.tsx`** — Add a tab bar at the top: "For You" | "Following"
  - "For You" = current `social.feed` (all public games, chronological)
  - "Following" = new `social.followingFeed` (only games from followed users)
  - Persist selected tab in state
  - Show "Follow some creators to see their games here" empty state for Following tab

---

## 5. Notifications System

**Why:** Without notifications, users don't know when someone interacts with their content. This is critical for engagement loops.

### Database

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,           -- 'like', 'comment', 'follow', 'reply', 'rating'
  actor_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT,             -- 'game', 'comment'
  target_id TEXT,
  game_id TEXT,                 -- for easy deep-linking
  message TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
```

### Backend

- **`NotificationService`** class
  - `createNotification(params)` — Insert notification row. Skip if actor === recipient (don't notify yourself).
  - `listNotifications(userId, limit, offset)` — Paginated, newest first, joins on `users` for actor info
  - `markAsRead(userId, notificationIds)` — Batch mark as read
  - `markAllAsRead(userId)` — Mark all as read
  - `getUnreadCount(userId)` — Count for badge

- **Fire notifications from existing mutations:**
  - `addReaction` on game → notify game owner
  - `addReaction` on comment → notify comment author
  - `addComment` → notify game owner
  - `addComment` with parentId → notify parent comment author
  - `follow` → notify target user
  - `rateGame` → notify game owner

- **tRPC routes:**
  - `social.listNotifications` (protectedProcedure, query)
  - `social.markNotificationsRead` (protectedProcedure, mutation)
  - `social.unreadNotificationCount` (protectedProcedure, query)

### Frontend

- **`app/app/notifications.tsx`** — New page
  - FlatList of notification items
  - Each item: actor avatar + message + time ago + unread dot
  - Tap → navigate to relevant content (game detail, user profile, etc.)
  - Pull to refresh
  - "Mark all as read" button

- **Notification bell badge** — Update `AppFrameHeader` or tab bar to show unread count
  - Poll `unreadNotificationCount` every 30-60 seconds, or on focus

- **`NotificationItem` component** — Renders a single notification with appropriate icon and message formatting

---

## 6. Discover / Search Users

**Why:** No way to find other users except by stumbling on their content in the feed.

### Backend

- **`social.searchUsers` query** (publicProcedure)
  - Input: `{ query: string, limit: number, offset: number }`
  - SQL: `SELECT ... FROM users WHERE display_name LIKE ? LIMIT ? OFFSET ?`
  - Returns: `{ id, displayName, avatarUrl, gameCount, followerCount }[]`

- **`social.suggestedUsers` query** (publicProcedure)
  - Returns top creators by follower count or game count
  - Excludes users the current user already follows

### Frontend

- **Update `app/app/discover.tsx`** — Already exists as a page
  - Add user search bar at top
  - Show suggested users section
  - Each user row: avatar + name + game count + follow button
  - Tap row → navigate to `/user/[id]`

---

## 7. Report / Block

**Why:** Content moderation is essential once you have user-generated content and social features.

### Database

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,    -- 'game', 'comment', 'user'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,         -- 'spam', 'inappropriate', 'harassment', 'other'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'reviewed', 'resolved'
  created_at INTEGER NOT NULL
);

CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_reports_status ON reports(status, created_at);
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
```

### Backend

- **`ReportService`** — `createReport(reporterId, targetType, targetId, reason, description)`
- **`BlockService`** — `block(blockerId, blockedId)`, `unblock(...)`, `isBlocked(...)`, `getBlockedIds(userId)`

- **Filter blocked users from:**
  - `social.feed` — Exclude games by blocked users
  - `social.followingFeed` — Same
  - `social.listComments` — Exclude comments by blocked users
  - `social.searchUsers` — Exclude blocked users

- **tRPC routes:**
  - `social.report` (protectedProcedure, mutation)
  - `social.block` (protectedProcedure, mutation)
  - `social.unblock` (protectedProcedure, mutation)
  - `social.listBlocked` (protectedProcedure, query)

### Frontend

- **Report modal** — Pops up from a "..." menu on games, comments, and user profiles
  - Reason picker: Spam, Inappropriate, Harassment, Other
  - Optional description text input
  - Submit → show confirmation toast

- **Block option** — In the same "..." menu on user profiles
  - Confirmation dialog: "Block this user? You won't see their content."

- **`app/app/settings/blocked-users.tsx`** — List of blocked users with unblock button

---

## 8. "Who Liked This" List

**Why:** Tapping the like count on Instagram shows you who liked the post.

### Backend

- **`social.getLikers` query** (publicProcedure)
  - Input: `{ targetType: 'game' | 'comment', targetId: string, limit: number, offset: number }`
  - Joins reactions → users, returns `{ id, displayName, avatarUrl }[]`

### Frontend

- **`LikersBottomSheet` component** — or a new page at `app/app/game/likers.tsx`
  - FlatList of user rows with follow buttons
  - Opened by tapping the like count text on `SocialFeedCard` or game detail page

---

## 9. Activity Feed (Your Activity)

**Why:** Users want to see their own history — games they liked, comments they made, etc.

### Backend

This can largely be built from existing tables without new storage:

- **`social.myActivity` query** (protectedProcedure)
  - Union query across reactions, comments, ratings, follows for the current user
  - Ordered by `created_at DESC`
  - Returns typed activity items: `{ type: 'like' | 'comment' | 'follow' | 'rating', targetId, gameTitle, createdAt, ... }`

Or, simpler approach: just add filtered queries:
- `social.myLikedGames` — Games the user has liked
- `social.myComments` — Comments the user has posted
- `social.myRatings` — Games the user has rated

### Frontend

- **Profile tab enhancement** — Add tabs: "Games" | "Liked" | "Saved"
  - Games: current game grid (user's own games)
  - Liked: games they've hearted
  - Saved: bookmarked games (already have `listBookmarks` endpoint)

---

## 10. Direct Messaging

**Why:** Standard social feature, but also the most complex to build. Intentionally last.

### Recommendation

DMs are the one feature where a managed service (Stream Chat, Sendbird) would save massive effort. Building DMs requires:
- Real-time message delivery (WebSockets / Durable Objects / SSE)
- Message persistence
- Read receipts
- Typing indicators
- Push notifications
- Media attachments
- Conversation list with last message preview

**Option A: Stream Chat** — Already considered for the social layer. Free Maker Plan covers this. Would need a thin adapter layer.

**Option B: DIY with Durable Objects** — Cloudflare Durable Objects can hold WebSocket connections. Each conversation gets a Durable Object that broadcasts messages to connected clients. Messages stored in D1.

**Option C: Defer** — Ship everything else first. DMs can come later and are not blocking any other social feature.

### If building DIY:

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  last_read_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
```

---

## Implementation Order

| Phase | Features | Effort | Dependencies |
|-------|----------|--------|--------------|
| **Phase 1** | Profile editing + bio, Follower/following lists, Share button | Small | None |
| **Phase 2** | Following-only feed, Discover/search users | Small | None |
| **Phase 3** | Notifications | Medium | Need to wire into existing mutations |
| **Phase 4** | Report/block | Medium | Need to filter existing queries |
| **Phase 5** | Who liked, Activity feed / profile tabs | Small | None |
| **Phase 6** | DMs | Large | Durable Objects or managed service |

Phase 1-2 are quick wins that round out the core experience. Phase 3 (notifications) is the biggest engagement driver. Phase 4 is essential before any public launch. Phase 5 is polish. Phase 6 is a separate project.

---

## Migration Strategy

All new tables can be added in a single migration file. Schema changes to existing tables (adding `bio` to users) are backward-compatible ALTERs.

Notification creation should be fire-and-forget (don't block the main mutation on notification insert failing). Use `ctx.executionCtx.waitUntil()` in Cloudflare Workers to run notification inserts after the response is sent.

Block filtering should be applied at the query level, not in application code, to avoid fetching and discarding rows.
