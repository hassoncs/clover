# Heartbeat

Recurring maintenance rituals that keep the codebase healthy. Not every session is feature work — some sessions are housekeeping, and that's valuable.

---

## Brain Sleep (Weekly-ish)

The deepest cleanup pass. Run when `.sisyphus/` feels bloated or at the end of a major feature push.

**What it does:**
1. Audit `.sisyphus/plans/` — delete completed plans (verify with code grep), delete speculative plans with zero progress after 14+ days, move reference docs to `docs/`
2. Audit `.sisyphus/notepads/` — delete stale notepads for completed features, extract any surviving insights into skills
3. Audit `.sisyphus/drafts/` and evidence files — delete ephemeral artifacts
4. Consolidate docs into skills — find `docs/` files that should be skill content, merge them, delete the originals
5. Prune `.worktrees/` — remove stale feature worktrees

**Trigger**: Run `brain-sleep` command, or manually when the plan/notepad count exceeds ~60 items.

**History**: Tracked in `.sisyphus/brain-sleep.md`. Three runs so far have deleted 230+ items total.

**Rules learned**:
- Code is the documentation — delete plans for shipped features
- Checkbox counting is unreliable alone — always verify with code grep
- Speculative plans older than 14 days should be deleted aggressively (git has history)
- Reference docs (catalogs, style guides, architecture specs) belong in `docs/`, not `plans/`

---

## Skill Audit (Bi-weekly)

Keep `.claude/skills/` accurate and current.

**What to check:**
1. **Stale file paths**: Do the paths mentioned in skills still exist? Grep to verify.
2. **Renamed types/interfaces**: Has `GameDefinition`, `EntityPrefab`, or other core types changed shape?
3. **New patterns**: Has the codebase adopted new patterns not captured in any skill?
4. **Skill coverage**: Are there domains with 3+ useful facts that don't have a skill yet?
5. **INDEX.md freshness**: Does `.claude/skills/INDEX.md` list all skills?

**Output**: Updated skills committed as `docs: update {skill} — {what changed}`

---

## Dependency Health (Monthly)

Check for security vulnerabilities and stale dependencies.

**What to check:**
1. `pnpm audit` — fix critical/high vulnerabilities
2. `pnpm outdated` — identify major version bumps worth evaluating
3. Check Expo SDK version — are we on the latest stable?
4. Check Cloudflare Workers compatibility date — should be recent
5. Review `patches/` directory — are any patches still needed after upstream fixes?

**Output**: Updated `pnpm-lock.yaml`, removed stale patches, filed issues for major upgrades.

---

## Content Pipeline Health (Weekly during launch prep)

Specific to the Amen launch. Becomes less frequent after launch.

**What to check:**
1. `contentDiagnostics.checkDrift` — find content that's gone stale
2. Content counts per game type — are we hitting launch targets?
3. AI review scores — are quality/humor scores holding up?
4. Audio coverage — what percentage of content has generated audio?

**Tools**: All available via `slopcade-api` MCP tools (`partyContent.*`, `contentDiagnostics.*`).

---

## Test Health (Per-session, lightweight)

Not a dedicated ritual — just part of working.

**What to check:**
1. Run the test suite for any package you touched: `pnpm --filter @slopcade/{package} test`
2. Check for pre-existing failures vs. failures you introduced
3. If a test is trivially broken (<5 min fix), fix it even if you didn't break it
4. Never delete a failing test to make the build pass

---

## Session Cleanup (Every session)

The "landing the plane" checklist. This isn't optional.

1. All planned todos marked done
2. `lsp_diagnostics` clean on changed files
3. Tests pass for touched packages
4. Changes committed with conventional format (`feat:`, `fix:`, `chore:`, `docs:`)
5. `git pull --rebase && bd sync && git push`
6. `git status` shows "up to date with origin"
7. File issues for anything that needs follow-up
8. Update plan/notepad progress if applicable

---

## Seasonal / One-Time

These aren't recurring but should be on the radar:

| Task | When | Notes |
|------|------|-------|
| Amen Easter content activation | Holy Week 2026 | `pack-scheduler.ts` handles this, but verify |
| App Store submission | Pre-launch | Requires human tasks in `docs/amen/human-todo-amen-launch.md` |
| Stripe production setup | Pre-launch | Requires human tasks in `.sisyphus/plans/stripe-human-tasks.md` |
| NativeWind migration completion | Ongoing | `.sisyphus/plans/stylesheet-to-nativewind-migration.md` |
