# Collaborative Editing — Future Phases

## Status: Deferred (needs design thinking)

## Prerequisites

Depends on `editor-realtime-file-sync.md` (FILE_CHANGED events + persistent WebSocket on GameRepoDO). That plan covers Phase 0 and Phase 1. This plan covers everything after.

## Current State

- Games are single-owner: `games.user_id` column, 20+ hardcoded `game.user_id !== ctx.user.id` checks
- No collaborators/teams/orgs tables exist
- `GameRepoDO` is already game-scoped (not user-scoped) — ready for multi-user
- R2 storage is game-scoped — ready for multi-user
- Persistent WebSocket broadcast will exist after Phase 1

## Phase 2: Access Control Model

### Open Design Questions (do NOT rush)

- **Org-based vs direct sharing vs hybrid?**
  - Orgs: users create organizations, games belong to orgs, access at org level (GitHub/Bitbucket model)
  - Direct: invite user X to game Y (simpler but less scalable)
  - Hybrid: games belong to a user OR an org
- **Role granularity:** `owner | editor | viewer` — is this enough?
- **Forking interaction:** Can you fork within your org without publishing?
- **Billing:** Who pays for AI usage in shared games?

### What We Know For Sure

- Replace 20+ ownership checks with `assertGameAccess(ctx, gameId, requiredRole)` helper
- Need a table mapping users → games/orgs with roles
- `GameRepoDO` doesn't need to change — auth happens at API layer

### Reference Patterns to Study

- **GitHub:** orgs → repos → collaborators, repo-level and org-level permissions
- **Figma:** team → project → file, link sharing + explicit invites
- **Linear:** workspace → teams → projects, role-based
- Keep it simple. Not building enterprise RBAC.

### Files With Ownership Checks to Replace

| File | Count |
|---|---|
| `api/src/trpc/routes/chat-threads.ts` | 7 checks |
| `api/src/trpc/routes/games.ts` | 4 checks |
| `api/src/trpc/routes/asset-system/generation-jobs.ts` | 3 checks |
| `api/src/trpc/routes/asset-system/orchestration.ts` | 1 check |
| `api/src/trpc/routes/package-compiler.ts` | 1 check |
| `api/src/trpc/routes/social.ts` | 2 checks |

### Estimated Effort: ~1 week (including design)

## Phase 3: Invitation UI & Sharing Flow

- Share button in editor top bar
- Invite by email (separate from platform `email_invites` table)
- Link sharing (public/private toggle exists as `is_public` on games)
- Real-time presence indicators (who's online in this game)
- Role management UI

### Estimated Effort: 1-2 weeks

## Phase 4: CRDT Co-Editing (Optional / Future)

Today: `writeFile` does full-file overwrite + git commit → last-write-wins. This is fine for multiple users editing *different files* in the same game.

For Google Docs-style concurrent editing within a single file:
- Yjs or Automerge CRDT for the code editor
- `GameRepoDO` as Yjs persistence/sync server (already has WebSocket, already serializes writes)
- This is a separate project

### Estimated Effort: Weeks
