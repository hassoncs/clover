# Tambo Model Migration - Learnings

## 2026-02-11 Task: Initial Setup
- Plan has 8 tasks across 3 waves
- Wave 1 (Tasks 1-3) can run in parallel: schema, chat handler, billing
- Wave 2 (Tasks 4-5) sequential: tRPC routes then frontend hook
- Wave 3 (Tasks 6-8) sequential: delete infra, docs, zero tech debt

## 2026-02-11 Task: Frontend Hook Migration
- Migrated frontend chat hook to use `chatThreads` tRPC routes.
- Replaced `agentRuns` mutations with `chatThreads.sendMessage` and `chatThreads.submitToolAnswer`.
- Implemented `generationStage` tracking for UI state.
- Implemented `pendingAskUser` handling for HITL flows.
- Mapped new message format to existing `ChatMessage` UI component types.

## 2026-02-11 Task: Codebase Analysis (Atlas Orchestrator)
- Tasks 1-5 are ALREADY COMPLETE from a previous session
- Migration file exists: api/migrations/20260211_threads_and_messages.sql
- Chat handler exists: api/src/chat/chat-handler.ts (advanceThread/resumeThread)
- Chat tools exist: api/src/chat/chat-tools.ts (readFile, writeFile, askUser)
- tRPC routes exist: api/src/trpc/routes/chat-threads.ts (sendMessage, submitToolAnswer, getMessages, etc.)
- Frontend hook exists: app/components/create-game/useEditorChat.ts (uses new tRPC routes)
- Billing already has settleMessage() in agent-billing-service.ts
- Router in router.ts already has chatThreadsRouter, no agentRuns router
- REMAINING: Wave 3 tasks (6, 7, 8) — cleanup, docs, zero tech debt

## Key Files to Delete (Task 6)
- api/src/agent/RunCoordinatorDO.ts (1542 lines)
- api/src/agent/engine/stage-executor.ts (470 lines)
- api/src/agent/engine/stages.ts
- api/src/agent/engine/gate-processor.ts
- api/src/agent/engine/tools.ts (old stage-based tools, replaced by chat-tools.ts)
- api/src/chat/chat-event-store.ts (old event store using chat_events table)
- api/src/chat/__tests__/chat-event-store.test.ts
- api/src/agent/__tests__/run-state-machine.test.ts (already broken - module not found)
- app/components/editor/AIEditor/useAgentRun.ts (old hook, already broken - agentRuns not found)

## Key Files to Keep
- api/src/agent/artifact-service.ts (used by chat-handler.ts)
- api/src/agent/RealtimeRelayDO.ts (voice relay, separate from chat)
- api/src/agent/engine/prompts.ts — CHAT_STAGE_PROMPT is imported by chat-handler.ts!
- api/src/economy/agent-billing-service.ts (has both old settleStep and new settleMessage)
- api/src/economy/wallet-service.ts (unchanged)

## Wrangler DO Bindings to Remove
- RUN_COORDINATOR (RunCoordinatorDO) 
- RUN_STEP_WORKER (RunStepWorkerDO)
- Keep: REALTIME_RELAY (RealtimeRelayDO)
- Migration tags v2 (new_classes: RunCoordinatorDO, RunStepWorkerDO) — needs delete_classes migration

## Pre-existing LSP Errors (before our changes)
- useAgentRun.ts: 'agentRuns' does not exist on tRPC type (7 errors)
- run-state-machine.test.ts: Cannot find module '@/agent/run-state-machine'
- RealtimeRelayDO.test.ts: Cannot find module '@/agent/RealtimeRelayDO'
- useSpeechToText.ts: Cannot find module './audioCapture'
- vitest.config.ts: overload mismatch (pre-existing)

## 2026-02-11 Task: Remove stage DO infrastructure (Task 6)
- Removed legacy stage orchestration DO surface from worker entry (`api/src/index.ts`): deleted `/ws/agent-run/:runId` and DO exports for run coordinator/worker.
- Deleted stage-era agent/chat infrastructure files and tests (RunCoordinator/RunStepWorker, stage engine, run state/recovery/event/billing bridge, chat-event-store, old `useAgentRun`).
- Preserved `api/src/agent/engine/prompts.ts` for `CHAT_STAGE_PROMPT` only; removed non-chat prompts/constants.
- Cleaned billing service to message-era API only (`settleMessage`), removing `agent_runs`/`agent_steps` reservation/step settlement paths.
- Removed `RUN_COORDINATOR`/`RUN_STEP_WORKER` from `api/wrangler.toml` and `api/src/trpc/context.ts`; added `v4` migration with `deleted_classes` for both old DO classes.
- Found and fixed one downstream app import from deleted hook by localizing `ClientAgentEvent` type in `app/lib/notifications/useAgentNotifications.ts`.

## 2026-02-11 Task: Update AGENTS.md (Task 7)
- Updated root AGENTS.md to reflect the new thread/message data model.
- Replaced legacy stage-based orchestration description with the new chat flow: User message → tRPC → chatHandler → generateText with tools → D1 persistence.
- Documented the new HITL flow using the `askUser` tool and `submitToolAnswer` tRPC route.
- Confirmed that chat orchestration is now handled by standard async functions in the Worker, with only `RealtimeRelayDO` remaining for voice/STT.

## 2026-02-11 Task: Zero Tech Debt Final Cutover (Task 8)
- Added `api/migrations/20260211_drop_legacy_tables.sql` to drop all stage-era tables in FK-safe order.
- Removed final legacy shared surface area: deleted `shared/src/types/agent-run.ts`, `shared/src/types/chat.ts`, `shared/src/schema/agent-runs.ts`, and pruned barrel exports.
- Removed obsolete reconciliation service at `api/src/ai/agent/reconciliation.ts` and cleaned stale artifacts (`api/dist-types/`, `shared/dist/`).
- Found two remaining runtime/test references to removed `AgentStepStage`; replaced with local `AgentStage` type in execution engine and tests.
- Found stale route test still targeting `chat_events`/`chat_threads`; updated to `messages`/`threads` and current `sendMessage` + `getMessages` API.
- `shared/src/index.ts` still re-exported deleted `./types/chat`; removed export to restore API typecheck.
- Verification complete: API typecheck passes and comprehensive legacy grep returns zero hits across `api/src`, `app`, and `shared/src`.
