## Schema Update Complete

- Removed 8 legacy tables (agent_runs, agent_steps, agent_events, agent_checkpoints, agent_costs, chat_threads, chat_events, chat_summaries)
- Added 2 new tables (threads, messages) from migration file
- Dev seed data intact: dev user + wallet with 999999999 microdollars
- File size: 825 → 727 lines (-98 lines)
- No FK constraint issues

The schema.sql is now the single source of truth for the unified thread/message model.

## Playwright E2E Attempt (2026-02-11)

- Reproduced hard startup blocker on web app at `http://localhost:8085`: Metro serves a non-dismissible redbox `Unable to resolve module postcss` from `nativewind/dist/tailwind/native.js`.
- Because the redbox is blocking and no actionable app controls render (no buttons in DOM), could not click Create Game, enter editor, send chat message, or verify workspace file creation via UI.
- Captured evidence artifacts in `.sisyphus/evidence/`: `e2e-01-home.png`, `e2e-02-blocked-server-error.png`, `e2e-console-errors.log`, `e2e-network.log`.
