---
name: social-features
description: Use when working with social features: comments, reactions, follows, bookmarks, ratings, notifications, reports, user blocking, or social feed functionality
---

# Social Features

Comments, reactions, follows, bookmarks, ratings, notifications, reports, and user blocking for the game platform.

## Backend Files

### Services (`api/src/social/`)

| File | Class | Constructor | Key Methods |
|------|-------|-------------|-------------|
| `comment-service.ts` | `CommentService` | `(db: D1Database)` | `createComment(params)`, `listComments(params)`, `editComment(commentId, userId, body, bodyJson?)`, `deleteComment(commentId, userId)`, `addReaction(userId, targetType, targetId, reactionType?)`, `removeReaction(userId, targetType, targetId, reactionType?)`, `getReactionStatus(userId, targetType, targetIds)` |
| `rating-service.ts` | `RatingService` | `(db: D1Database)` | `rate(gameId, userId, score)`, `getSummary(gameId, userId?)`, `removeRating(gameId, userId)` |
| `follow-service.ts` | `FollowService` | `(db: D1Database)` | `follow(followerId, targetType, targetId)`, `unfollow(followerId, targetType, targetId)`, `isFollowing(followerId, targetType, targetIds)`, `getUserFollowCounts(userId)`, `getFollowers(userId, limit?, offset?)`, `getFollowing(userId, limit?, offset?)` |
| `bookmark-service.ts` | `BookmarkService` | `(db: D1Database)` | `bookmark(userId, gameId)`, `unbookmark(userId, gameId)`, `isBookmarked(userId, gameIds)`, `listBookmarks(userId, limit?, offset?)` |
| `block-service.ts` | `BlockService` | `(db: D1Database)` | `block(blockerId, blockedId)`, `unblock(blockerId, blockedId)`, `isBlocked(blockerId, blockedIds)`, `getBlockedIds(blockerId)`, `listBlocked(blockerId, limit, offset)` |
| `notification-service.ts` | `NotificationService` | `(db: D1Database)` | `createNotification(params)`, `listNotifications(userId, limit, offset)`, `markAsRead(userId, notificationIds)`, `markAllAsRead(userId)`, `getUnreadCount(userId)` |
| `report-service.ts` | `ReportService` | `(db: D1Database)` | `createReport(reporterId, targetType, targetId, reason, description?)` |

### Exported Types

From `comment-service.ts`:
- `CommentRow` — DB row shape: `id`, `game_id`, `user_id`, `parent_id`, `body`, `body_json`, `depth`, `reply_count`, `reaction_count`, `is_edited`, `created_at`, `updated_at`, `deleted_at`
- `CommentWithAuthor` — extends `CommentRow` with `display_name`, `avatar_url`
- `ReactionRow` — DB row: `id`, `user_id`, `target_type`, `target_id`, `reaction_type`, `created_at`
- `CommentWithMeta` — camelCase API shape: `id`, `gameId`, `userId`, `parentId`, `body`, `bodyJson`, `depth`, `replyCount`, `reactionCount`, `isEdited`, `createdAt`, `updatedAt`, `author: { displayName, avatarUrl }`, `userReacted`
- Error classes: `CommentNotFoundError`, `CommentValidationError`, `CommentPermissionError`

From `rating-service.ts`:
- `RatingRow` — DB row: `id`, `game_id`, `user_id`, `score`, `created_at`, `updated_at`
- `RatingSummary` — `averageScore`, `totalRatings`, `distribution: Record<number, number>`, `userRating: number | null`
- Error class: `RatingValidationError`

From `follow-service.ts`:
- `FollowCounts` — `followerCount`, `followingCount`

From `notification-service.ts`:
- `NotificationWithActor` — `id`, `type`, `actorId`, `actorName`, `actorAvatarUrl`, `targetType`, `targetId`, `gameId`, `message`, `isRead`, `createdAt`

From `block-service.ts`:
- Error class: `BlockValidationError`

### tRPC Routers

Registered in `api/src/trpc/router.ts` as:

```
social: socialRouter           // api/src/trpc/routes/social.ts
socialExtra: socialExtraRouter // api/src/trpc/routes/social-extra.ts
notifications: notificationsRouter // api/src/trpc/routes/notifications.ts
moderation: moderationRouter   // api/src/trpc/routes/moderation.ts
```

#### `socialRouter` endpoints (`api/src/trpc/routes/social.ts`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `addComment` | mutation | protected | Create comment (with optional `parentId` for replies) |
| `listComments` | query | public | Paginated comments (cursor-based), filters blocked users |
| `editComment` | mutation | protected | Edit own comment |
| `deleteComment` | mutation | protected | Soft-delete own comment |
| `addReaction` | mutation | protected | Add reaction to game or comment (default: `'like'`) |
| `removeReaction` | mutation | protected | Remove reaction |
| `getReactionStatus` | query | public | Check if current user reacted to targets |
| `rateGame` | mutation | protected | Rate game 1-5 stars |
| `getRating` | query | public | Get rating summary for game |
| `follow` | mutation | protected | Follow user or game (`targetType: 'user' | 'game'`) |
| `unfollow` | mutation | protected | Unfollow user or game |
| `isFollowing` | query | public | Check follow status for targets |
| `getUserProfile` | query | public | Full user profile with games, follow counts |
| `getFollowers` | query | public | List user's followers |
| `getFollowing` | query | public | List who user follows |
| `bookmark` | mutation | protected | Bookmark a game |
| `unbookmark` | mutation | protected | Remove bookmark |
| `isBookmarked` | query | public | Check bookmark status |
| `listBookmarks` | query | protected | List user's bookmarked game IDs |
| `feed` | query | public | Public game feed with social metadata (likes, bookmarks, follow status) |

#### `socialExtraRouter` endpoints (`api/src/trpc/routes/social-extra.ts`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `followingFeed` | query | protected | Games from followed users |
| `searchUsers` | query | public | Search users by display name |
| `suggestedUsers` | query | public | Users sorted by game count |
| `getLikers` | query | public | List users who liked a target |
| `myLikedGames` | query | protected | Games the current user liked |
| `mySavedGames` | query | protected | Games the current user bookmarked |

#### `notificationsRouter` endpoints (`api/src/trpc/routes/notifications.ts`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `list` | query | protected | Paginated notifications with actor info |
| `markAsRead` | mutation | protected | Mark specific notifications as read |
| `markAllAsRead` | mutation | protected | Mark all notifications as read |
| `unreadCount` | query | protected | Get unread notification count |

#### `moderationRouter` endpoints (`api/src/trpc/routes/moderation.ts`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `report` | mutation | protected | Report content (`targetType: 'game' | 'comment' | 'user'`, `reason: 'spam' | 'inappropriate' | 'harassment' | 'other'`) |
| `block` | mutation | protected | Block a user |
| `unblock` | mutation | protected | Unblock a user |
| `listBlocked` | query | protected | List blocked users with display info |
| `isBlocked` | query | protected | Check if users are blocked |

## Notification Type Values

There is **no `NotificationType` enum or type alias** in the codebase. The `type` field on `CreateNotificationParams` and `NotificationRow` is `string`. The actual values used in `social.ts`:

| Value | Created When |
|-------|-------------|
| `'comment'` | Someone comments on your game |
| `'comment_reply'` | Someone replies to your comment |
| `'like'` | Someone likes your game or comment |
| `'follow'` | Someone follows you |

Notifications are created inline in the `socialRouter` mutation handlers (not in the services). They are fire-and-forget (`.catch(() => {})`). Self-notifications are skipped (`actorId === userId` check in `NotificationService.createNotification`).

## Database Tables (D1)

From `api/schema.sql`:

### `comments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `game_id` | TEXT NOT NULL | FK → games(id) ON DELETE CASCADE |
| `user_id` | TEXT NOT NULL | FK → users(id) |
| `parent_id` | TEXT | FK → comments(id) ON DELETE CASCADE |
| `body` | TEXT NOT NULL | |
| `body_json` | TEXT | Rich content (mentions, links, images) |
| `depth` | INTEGER NOT NULL DEFAULT 0 | CHECK (depth <= 2) |
| `reply_count` | INTEGER NOT NULL DEFAULT 0 | |
| `reaction_count` | INTEGER NOT NULL DEFAULT 0 | |
| `is_edited` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` | INTEGER NOT NULL | epoch ms |
| `updated_at` | INTEGER NOT NULL | epoch ms |
| `deleted_at` | INTEGER | soft delete |

### `reactions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `user_id` | TEXT NOT NULL | FK → users(id) |
| `target_type` | TEXT NOT NULL | CHECK IN ('game', 'comment') |
| `target_id` | TEXT NOT NULL | |
| `reaction_type` | TEXT NOT NULL DEFAULT 'like' | |
| `created_at` | INTEGER NOT NULL | |
| UNIQUE | | `(user_id, target_type, target_id, reaction_type)` |

### `follows`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `follower_id` | TEXT NOT NULL | FK → users(id) |
| `target_type` | TEXT NOT NULL | CHECK IN ('user', 'game') |
| `target_id` | TEXT NOT NULL | |
| `created_at` | INTEGER NOT NULL | |
| UNIQUE | | `(follower_id, target_type, target_id)` |

### `ratings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `game_id` | TEXT NOT NULL | FK → games(id) ON DELETE CASCADE |
| `user_id` | TEXT NOT NULL | FK → users(id) |
| `score` | INTEGER NOT NULL | CHECK (score >= 1 AND score <= 5) |
| `created_at` | INTEGER NOT NULL | |
| `updated_at` | INTEGER NOT NULL | |
| UNIQUE | | `(game_id, user_id)` |

### `bookmarks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `user_id` | TEXT NOT NULL | FK → users(id) |
| `game_id` | TEXT NOT NULL | FK → games(id) ON DELETE CASCADE |
| `created_at` | INTEGER NOT NULL | |
| UNIQUE | | `(user_id, game_id)` |

### `reports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `reporter_id` | TEXT NOT NULL | |
| `target_type` | TEXT NOT NULL | |
| `target_id` | TEXT NOT NULL | |
| `reason` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | TEXT NOT NULL DEFAULT 'pending' | |
| `created_at` | INTEGER NOT NULL | |

### `blocks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | nanoid |
| `blocker_id` | TEXT NOT NULL | |
| `blocked_id` | TEXT NOT NULL | |
| `created_at` | INTEGER NOT NULL | |
| UNIQUE INDEX | | `(blocker_id, blocked_id)` |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | crypto.randomUUID() |
| `user_id` | TEXT NOT NULL | |
| `type` | TEXT NOT NULL | free-form string |
| `actor_id` | TEXT NOT NULL | |
| `target_type` | TEXT | |
| `target_id` | TEXT | |
| `game_id` | TEXT | |
| `message` | TEXT | |
| `is_read` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` | INTEGER NOT NULL | |

## Frontend Components

### `app/components/social/`

Barrel export from `app/components/social/index.ts`:

| Export | File |
|--------|------|
| `GameComments` | `GameComments.tsx` |
| `CommentItem` | `CommentItem.tsx` |
| `LikeButton` | `LikeButton.tsx` |
| `StarRating` | `StarRating.tsx` |
| `FollowButton` | `FollowButton.tsx` |
| `SocialFeedCard` | `SocialFeedCard.tsx` |
| `CommentsBottomSheet` | `CommentsBottomSheet.tsx` (also exports `CommentsBottomSheetHandle` type) |
| `NotificationItem` | `NotificationItem.tsx` |
| `ReportModal` | `ReportModal.tsx` |
| `LikersBottomSheet` | `LikersBottomSheet.tsx` (also exports `LikersBottomSheetHandle` type) |

### Pages

| Path | Purpose |
|------|---------|
| `app/app/(tabs)/feed.tsx` | Social feed page |
| `app/app/user/[id].tsx` | User profile page |
| `app/app/user/followers.tsx` | Followers list page |
| `app/app/notifications.tsx` | Notifications page |

## Gotchas

- **Reactions live in CommentService**: `addReaction`, `removeReaction`, `getReactionStatus` are methods on `CommentService`, not a separate service. They handle both game and comment reactions.
- **No NotificationType enum**: The `type` field is a plain `string`. Values are hardcoded in the router mutation handlers, not validated by a type.
- **Notifications are fire-and-forget**: Created with `.catch(() => {})` in router handlers — failures are silently swallowed.
- **Comment max depth is 2**: Enforced by `MAX_COMMENT_DEPTH = 2` in `CommentService` and `CHECK (depth <= 2)` in the DB schema.
- **Blocked user filtering**: `listComments` filters out comments from blocked users. The `feed` query excludes games from blocked users.
- **Follow targets are polymorphic**: `follows.target_type` can be `'user'` or `'game'`. Following a game increments `games.follower_count`.
- **Denormalized counts**: `games` table has `comment_count`, `like_count`, `follower_count`, `rating_average`, `rating_count` columns updated by service methods.
- **Soft deletes for comments**: Comments use `deleted_at` column, not hard deletes.
- **notifications use `crypto.randomUUID()`** while all other social tables use `nanoid()` for ID generation.

## Related Skills

- **storage-ops**: D1 database operations
- **agent-orchestration**: Chat system (separate from social)
