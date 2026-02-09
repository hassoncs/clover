# Social Features — Architecture Review & Manual Testing Plan

> Generated 2026-02-09. Covers everything built by the overnight agent session.

---

## 1. What Was Built — Executive Summary

A complete social layer was added across the full stack in a single session. It includes **7 backend services**, **4 tRPC routers**, **8 new database tables**, **11 frontend components**, and **5 new screens/pages**. It covers comments, reactions (likes), star ratings, follows, bookmarks, blocking, reporting, notifications, and a social feed.

**Automated test coverage: ZERO.** No tests were written for any social feature — not a single service, route, or component test.

---

## 2. Architecture Map

### 2.1 Database Layer (D1/SQLite)

4 migration files, all dated `20260209`:

| Migration File | Tables Created | Columns Added |
|---|---|---|
| `20260209_social_comments.sql` | `comments`, `reactions`, `follows`, `ratings`, `bookmarks` | `games.like_count`, `games.comment_count`, `games.follower_count`, `games.rating_average`, `games.rating_count` |
| `20260209_moderation.sql` | `reports`, `blocks` | — |
| `20260209_notifications.sql` | `notifications` | — |
| `20260209_user_bio.sql` | — | `users.bio` |

**Tables summary:**

| Table | Key Design Decisions |
|---|---|
| `comments` | Threaded, max depth=2. Soft-delete via `deleted_at`. Denormalized `reply_count`, `reaction_count`. |
| `reactions` | Polymorphic `target_type` (game\|comment). Unique constraint on (user, target, type). |
| `follows` | Polymorphic `target_type` (user\|game). Unique constraint on (follower, target_type, target_id). |
| `ratings` | 1-5 star scale. One per user per game. Updates `games.rating_average` + `games.rating_count`. |
| `bookmarks` | Simple user→game save. Unique constraint on (user, game). |
| `blocks` | Simple user→user block. Unique constraint. |
| `reports` | Polymorphic target (game\|comment\|user). Status tracking (`pending`). |
| `notifications` | Actor-based (who did what). `is_read` flag. |

### 2.2 Service Layer (`api/src/social/`)

| Service | File | Methods |
|---|---|---|
| **CommentService** | `comment-service.ts` (397 lines) | `createComment`, `listComments`, `editComment`, `deleteComment`, `addReaction`, `removeReaction`, `getReactionStatus` |
| **FollowService** | `follow-service.ts` (143 lines) | `follow`, `unfollow`, `isFollowing`, `getUserFollowCounts`, `getFollowers`, `getFollowing` |
| **BookmarkService** | `bookmark-service.ts` (74 lines) | `bookmark`, `unbookmark`, `isBookmarked`, `listBookmarks` |
| **RatingService** | `rating-service.ts` (114 lines) | `rate`, `getSummary`, `removeRating` |
| **BlockService** | `block-service.ts` (111 lines) | `block`, `unblock`, `isBlocked`, `getBlockedIds`, `listBlocked` |
| **ReportService** | `report-service.ts` (26 lines) | `createReport` |
| **NotificationService** | `notification-service.ts` (141 lines) | `createNotification`, `listNotifications`, `markAsRead`, `markAllAsRead`, `getUnreadCount` |

### 2.3 API Layer (tRPC Routers)

**4 routers** registered in `api/src/trpc/router.ts`:

#### `social` router (`routes/social.ts`) — 14 procedures
| Procedure | Type | Auth | Purpose |
|---|---|---|---|
| `addComment` | mutation | protected | Post a comment or reply (max depth 2) |
| `listComments` | query | public | Paginated comments for a game (cursor-based) |
| `editComment` | mutation | protected | Edit own comment |
| `deleteComment` | mutation | protected | Soft-delete own comment |
| `addReaction` | mutation | protected | Like a game or comment |
| `removeReaction` | mutation | protected | Unlike a game or comment |
| `getReactionStatus` | query | public* | Check if user liked specific targets (returns `{}` if not logged in) |
| `rateGame` | mutation | protected | Submit 1-5 star rating |
| `getRating` | query | public | Get rating summary + distribution |
| `follow` | mutation | protected | Follow a user or game |
| `unfollow` | mutation | protected | Unfollow a user or game |
| `isFollowing` | query | public* | Check follow status for targets |
| `getUserProfile` | query | public | Full profile: bio, stats, games list, follow status |
| `getFollowers` | query | public | List followers of a user |
| `getFollowing` | query | public | List who a user follows |
| `bookmark` | mutation | protected | Save a game |
| `unbookmark` | mutation | protected | Unsave a game |
| `isBookmarked` | query | public* | Check bookmark status |
| `listBookmarks` | query | protected | List saved games |
| `feed` | query | public | Global discovery feed with social context |

#### `socialExtra` router (`routes/social-extra.ts`) — 5 procedures
| Procedure | Type | Auth | Purpose |
|---|---|---|---|
| `followingFeed` | query | protected | Feed filtered to followed users' games |
| `searchUsers` | query | public | Search users by display name (LIKE query) |
| `suggestedUsers` | query | public | Users ranked by game count |
| `getLikers` | query | public | Who liked a specific game/comment |
| `myLikedGames` | query | protected | Games the current user has liked |
| `mySavedGames` | query | protected | Games the current user has bookmarked |

#### `moderation` router (`routes/moderation.ts`) — 4 procedures
| Procedure | Type | Auth | Purpose |
|---|---|---|---|
| `report` | mutation | protected | Report a game, comment, or user |
| `block` | mutation | protected | Block a user |
| `unblock` | mutation | protected | Unblock a user |
| `listBlocked` | query | protected | List blocked users |
| `isBlocked` | query | protected | Check block status for user IDs |

#### `notifications` router (`routes/notifications.ts`) — 4 procedures
| Procedure | Type | Auth | Purpose |
|---|---|---|---|
| `list` | query | protected | Paginated notification list |
| `markAsRead` | mutation | protected | Mark specific notifications as read |
| `markAllAsRead` | mutation | protected | Mark all as read |
| `unreadCount` | query | protected | Get unread count |

### 2.4 Frontend Layer

#### Screens/Pages (Expo Router)
| Screen | File | Uses |
|---|---|---|
| Feed (tab) | `app/app/(tabs)/feed.tsx` | TikTok-style vertical scroll, like/bookmark/comment/share/report |
| User Profile | `app/app/user/[id].tsx` | Profile, stats, games grid, follow button |
| Followers/Following | `app/app/user/followers.tsx` | Tab view of followers and following lists |
| Blocked Users | `app/app/settings/blocked-users.tsx` | List + unblock blocked users |
| Notifications | `app/app/notifications.tsx` | Notification list with read status |

#### Reusable Components (`app/components/social/`)
| Component | File | Purpose |
|---|---|---|
| `GameComments` | `GameComments.tsx` | Full comment section with reply support |
| `CommentItem` | `CommentItem.tsx` | Single comment with reactions, edit, delete |
| `CommentsBottomSheet` | `CommentsBottomSheet.tsx` | Bottom sheet wrapper for comments |
| `LikeButton` | `LikeButton.tsx` | Animated like button |
| `FollowButton` | `FollowButton.tsx` | Follow/unfollow toggle with optimistic UI |
| `StarRating` | `StarRating.tsx` | Interactive star rating input |
| `SocialFeedCard` | `SocialFeedCard.tsx` | Card component for feed items |
| `NotificationItem` | `NotificationItem.tsx` | Single notification row |
| `ReportModal` | `ReportModal.tsx` | Modal for reporting content |
| `LikersBottomSheet` | `LikersBottomSheet.tsx` | Bottom sheet showing who liked something |

---

## 3. Automated Test Coverage

### Current State: **No social feature tests exist.**

The `api/` workspace has 25 test files, but they all cover other features (agent runs, AI generation, economy, games). There are no test files for:
- Any service in `api/src/social/`
- Any route in `api/src/trpc/routes/social*.ts` or `moderation.ts` or `notifications.ts`
- Any frontend component in `app/components/social/`

### What Should Have Tests (Priority Order)
1. **CommentService** — most complex: threading, depth limits, counters, soft delete
2. **FollowService** — self-follow guard, denormalized counters
3. **BlockService** — self-block guard, visibility filtering
4. **RatingService** — upsert logic, average recalculation
5. **Social router** — auth checks, error mapping, input validation
6. **Moderation router** — self-block prevention
7. **BookmarkService** — idempotency

---

## 4. Manual Testing Plan

### Prerequisites
1. Start dev environment: `pnpm dev` (Metro + API + Godot watcher)
2. Have 2 user accounts ready (User A and User B). Log in from different sessions or switch accounts.
3. Have at least 1 published game in the system.
4. Keep browser DevTools / network inspector open to watch tRPC calls.

> **Convention**: ✅ = pass, ❌ = fail, ⚠️ = works but has issue. Note the result next to each item.

---

### 4.1 Database Migrations

| # | Test | Steps | Expected |
|---|---|---|---|
| M1 | Tables exist | Run API locally, check D1 console or `wrangler d1 execute` for tables: `comments`, `reactions`, `follows`, `ratings`, `bookmarks`, `blocks`, `reports`, `notifications` | All 8 tables exist |
| M2 | Games table updated | Check `games` table has columns: `like_count`, `comment_count`, `follower_count`, `rating_average`, `rating_count` | All columns present with default 0 |
| M3 | Users table updated | Check `users` table has `bio` column | Column exists, nullable |

---

### 4.2 Social Feed

| # | Test | Steps | Expected |
|---|---|---|---|
| F1 | Feed loads | Navigate to Feed tab | Games listed in vertical scroll, no crash |
| F2 | Feed pagination | Scroll through 20+ games | TikTok-style snap pagination works, content loads |
| F3 | Empty state | Test with no public games | "No games yet" message shown |
| F4 | Creator info shown | Look at feed items | Creator avatar (colored initials), name visible |
| F5 | Tap game card | Tap a game thumbnail | Navigates to game detail screen |
| F6 | Tap creator | Tap creator row in a feed item | Navigates to `/user/[id]` profile screen |

---

### 4.3 Comments

| # | Test | Steps | Expected |
|---|---|---|---|
| C1 | Open comments | Tap comment icon on a feed item | Comments bottom sheet opens |
| C2 | Post comment (logged in) | Type a comment, submit | Comment appears at top, game's comment_count increments |
| C3 | Post comment (logged out) | Try commenting while not logged in | Should be blocked (protected procedure) |
| C4 | Reply to comment | Tap reply on a comment, submit reply | Reply appears nested under parent, reply_count on parent increments |
| C5 | Reply depth limit | Reply to a depth-2 reply | Should fail with "Maximum reply depth of 2 exceeded" |
| C6 | Edit own comment | Long-press / tap edit on your comment, change text | Comment updates, shows "edited" indicator |
| C7 | Edit someone else's comment | Try editing another user's comment | Should fail with 403 Forbidden |
| C8 | Delete own comment | Tap delete on your comment | Comment disappears, comment_count decrements |
| C9 | Delete someone else's | Try deleting another user's comment | Should fail with 403 Forbidden |
| C10 | Pagination | Post 25+ comments, scroll | Cursor-based pagination loads more |
| C11 | Empty state | Open comments on a game with no comments | Shows empty state message |

---

### 4.4 Reactions (Likes)

| # | Test | Steps | Expected |
|---|---|---|---|
| R1 | Like a game | Tap heart icon on feed item | Heart fills red, like count increments |
| R2 | Unlike a game | Tap filled heart | Heart outlines, like count decrements |
| R3 | Like a comment | Tap like on a comment | Reaction count on comment increments |
| R4 | Double-like idempotent | Like the same game twice rapidly | Should only register once (existing check) |
| R5 | Like while logged out | Attempt to like without auth | Should fail silently (UI check) or show login prompt |
| R6 | View likers | Tap like count number | Likers bottom sheet opens showing usernames |
| R7 | Like count persistence | Like a game, refresh page | Like count persists in DB |

---

### 4.5 Star Ratings

| # | Test | Steps | Expected |
|---|---|---|---|
| S1 | Rate a game | Tap stars to rate (e.g., 4 stars) | Rating submitted, average updates |
| S2 | Update rating | Change from 4 stars to 2 stars | Rating updates (upsert), average recalculates |
| S3 | View rating summary | Check rating display on game | Shows average, total count, distribution (if shown) |
| S4 | Invalid rating | Try submitting score=0 or score=6 (via API/network) | Validation error returned |
| S5 | Rating persistence | Rate, close app, reopen | Your rating is still there |

---

### 4.6 Follows

| # | Test | Steps | Expected |
|---|---|---|---|
| FL1 | Follow a user | Go to user profile, tap Follow | Button changes to "Following", follower count increments |
| FL2 | Unfollow a user | Tap "Following" button | Reverts to "Follow", count decrements |
| FL3 | Self-follow prevented | Try following yourself (via profile or API) | Returns `{ followed: false }`, no row created |
| FL4 | Follow a game | Find follow-game UI (if present on game detail) | Follow persists, game's follower_count increments |
| FL5 | View followers list | Tap follower count on profile | Navigates to followers tab, shows list |
| FL6 | View following list | Tap following count on profile | Navigates to following tab, shows list |
| FL7 | Following feed | After following User B, check "Following" feed | Shows only games by User B |
| FL8 | Following feed empty | Check following feed with no follows | Shows empty state |

---

### 4.7 Bookmarks

| # | Test | Steps | Expected |
|---|---|---|---|
| B1 | Bookmark a game | Tap bookmark icon on feed | Icon fills yellow, game saved |
| B2 | Unbookmark | Tap filled bookmark | Icon outlines, bookmark removed |
| B3 | View saved games | Navigate to "My Saved Games" (if UI exists) | Shows list of bookmarked games |
| B4 | Bookmark persistence | Bookmark, refresh | Bookmark state persists |

---

### 4.8 User Profiles

| # | Test | Steps | Expected |
|---|---|---|---|
| P1 | View own profile | Navigate to `/user/[yourId]` | Shows avatar, name, bio, stats, games |
| P2 | View other profile | Tap a creator from feed | Shows their profile with Follow button |
| P3 | Profile stats accuracy | Check follower/following/game counts | Match actual database state |
| P4 | Profile not found | Navigate to `/user/nonexistent-id` | "User not found" message |
| P5 | Games grid | User with multiple games | Grid layout shows thumbnails + titles |
| P6 | Bio display | User with bio set | Bio text visible under name |

---

### 4.9 Blocking

| # | Test | Steps | Expected |
|---|---|---|---|
| BL1 | Block a user | Block User B | Returns `{ blocked: true }` |
| BL2 | Self-block prevented | Try blocking yourself | "Cannot block yourself" error |
| BL3 | Double-block idempotent | Block same user twice | Returns `{ blocked: true }` without error |
| BL4 | View blocked list | Go to Settings → Blocked Users | Shows blocked users with unblock option |
| BL5 | Unblock a user | Tap Unblock on a blocked user | User removed from blocked list |
| BL6 | Block visibility | After blocking User B, check if their content is hidden | **NOTE: The services don't appear to filter blocked user content from feeds/comments. This may be a gap.** |

---

### 4.10 Reporting

| # | Test | Steps | Expected |
|---|---|---|---|
| RP1 | Report a game | Tap "..." on feed item, select report reason | Report modal opens, submission succeeds |
| RP2 | Report a comment | Report option on a comment | Report created with target_type='comment' |
| RP3 | Report a user | Report option on profile (if exists) | Report created with target_type='user' |
| RP4 | Report reasons | Check available reasons | 'spam', 'inappropriate', 'harassment', 'other' |
| RP5 | Report with description | Add optional description text | Stored in DB |

---

### 4.11 Notifications

| # | Test | Steps | Expected |
|---|---|---|---|
| N1 | Notification screen loads | Navigate to notifications | List renders (may be empty) |
| N2 | Unread count | Check notification badge/count | Shows count of `is_read=0` notifications |
| N3 | Mark as read | Tap a notification | Marked as read, unread count decrements |
| N4 | Mark all as read | Tap "Mark all as read" (if UI exists) | All notifications marked read |
| N5 | Notification triggers | **NOTE: NotificationService.createNotification exists but is NOT called from any social route (follow, comment, like).** Notifications may not be generated automatically. | This is likely a gap — check if notifications are actually being created. |

---

### 4.12 Search & Discovery

| # | Test | Steps | Expected |
|---|---|---|---|
| D1 | Search users | Use search feature, type a name | Returns matching users with game count + follower count |
| D2 | Suggested users | Check suggested users section | Shows users ranked by game count, excludes current user |
| D3 | My liked games | Navigate to liked games section | Shows games you've liked |

---

## 5. Known Gaps & Concerns

| # | Issue | Severity | Details |
|---|---|---|---|
| G1 | **No automated tests** | 🔴 High | Zero test coverage for 7 services, 4 routers, 11 components |
| G2 | **Notifications not wired up** | 🟡 Medium | `NotificationService.createNotification()` exists but is never called from follow/like/comment handlers. Notifications table will stay empty. |
| G3 | **Blocked users not filtered** | 🟡 Medium | `BlockService` tracks blocks but feeds, comments, and profiles don't appear to filter out blocked users' content. |
| G4 | **Feed hardcodes like/comment counts to 0** | 🟡 Medium | `feed.tsx` line 366-367 sets `likeCount: 0, commentCount: 0` when mapping `publicGames` to `FeedGame`. The social router's `feed` query returns real counts, but the screen uses `useBrowseGames` hook which doesn't seem to use the social feed endpoint. |
| G5 | **SQL injection surface in IN clauses** | 🟢 Low | Services build `IN (${placeholders})` clauses — this is safe since they use parameterized `?` placeholders, but worth noting the pattern. |
| G6 | **No rate limiting** | 🟡 Medium | No rate limiting on comment creation, reactions, or report submissions. |
| G7 | **Comment body_json unused** | 🟢 Low | `body_json` column exists for rich text but no frontend sends or renders it. |
| G8 | **No comment moderation** | 🟡 Medium | Reports are stored but nothing processes them (no admin panel, no automated review). |
| G9 | **Search uses LIKE %query%** | 🟢 Low | `searchUsers` uses SQL `LIKE %query%` — this won't use indexes and will be slow at scale. Fine for now. |
