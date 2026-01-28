# Audit Plans Skill

> **Trigger**: `/audit plans` - Quick overview of Sisyphus plan status
>
> **Purpose**: See what plans exist, how old they are, and if they're done

---

## Quick Usage

```
/audit plans              # List all plans with status
/audit plans stale        # Show only stale (>30 days) plans
/audit plans <name>       # Details on specific plan
```

---

## Output Format

```
| Plan | Age | Status | Description |
|------|-----|--------|-------------|
| credit-system | 3d | 🟡 Ready | Microdollar credit system |
| game-engine-redesign | 3d | 🟢 85% | Unity marketplace refactor |
| bluetooth-crash-fix | 4d | 🔴 Not started | iOS crash + Sentry |
| fsm-system | 45d | 🟢 Done | State machine system |
```

**Status Icons**:
- 🟢 Done / On track
- 🟡 Ready / In Progress
- 🔴 Stale / Abandoned / Not started

---

## Where Plans Live

- `.sisyphus/plans/` - Active plans (34+ files)
- `.sisyphus/notepads/` - Task breakdowns per project
- `.sisyphus/completed/` - Finished plans
- `docs/plans/` - Architecture plans

---

## How Status is Determined

| Field | Source |
|-------|--------|
| Age | File creation date |
| Done? | All `- [x]` checkboxes checked |
| Stale | >30 days old with no progress |
| Description | First sentence or TL;DR section |
