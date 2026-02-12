Slopcade Target Architecture

 2026-02-06
. findings
 Phased refactoring high-impact changes



 Design Principles

. Each module does one thing.
. No reaching internals.
. Source state one place.
. operations produce errors.
. Public Smallest interface necessary.
. system clear cleanup path.



 Phase A API Route Decomposition Impact)

. Split-system., 231 lines 4 files

 One file handles themes, asset packs, generation jobs, UI components.



 api/src/trpc/routes
-system
 index. lines mergeRouters re-export
 themes. CRUD planner
 asset-packs. Pack management entries
 generation-jobs. lines Job/task orchestration provider calls
 ui-components. lines component generation



 `themes Owns theme records. create,,,, delete,.
 `asset-packs Owns pack entry records.,,,,.
 `generation-jobs Owns task records.,-packs,. create,, retry, cancel.
 `ui-components Owns UI component specs. generation-jobs generation., getPack.

 file split no behavior changes. Move procedures files,..

. `RunCoordinatorDO., 803 lines 5 files

 WebSocket management, run state machine, recovery, billing, gate processing one class.



/src
 RunCoordinatorDO. lines WebSocket handler state dispatch
 run-state-machine. transitions, validation
 run-event-store. Event persistence replay
-recovery. Lease management recovery attempts
 run-billing-bridge. lines Cost reservation/settlement delegation
 gate-processor. Gate evaluation
 types. Shared types



 Owns WebSocket connections DO lifecycle. Delegates logic.
-state-machine functions state transitions.. Testable.
-event-store Owns event persistence. append, replay, getRange.
-recovery Owns lease logic.,,.
-billing-bridge wrapper WalletService AgentBillingService.

.-runs. route (1, 020 lines 2 files



/trpc/routes
 agent-runs.~500 lines tRPC procedures
 agent-runs-service. lines Business logic, orchestration




 Phase B Game Engine Decomposition Impact

..., 288 lines 6

 React component initialization, input collection, event routing, frame loop, lifecycle, UI.



-engine
 GameRuntime..~400 lines React systems, renders UI

 GameInitializer.~300 lines Setup bridge, physics, loader, system registration
 GameInputCollector.~250 lines Unified input collection, touch, tilt, drag, buttons
 GameFrameOrchestrator.~200 lines collect input build context. update sync
 GameLifecycleManager.~200 lines State loading ready playing won
 GameEventRouter.~150 lines Route collision events event queue



. Owns state,,. Delegates.
 Owns setup sequence. Returns initialized game systems. async.
 Owns input...
 Owns frame loop. Calls input collector builds UpdateContext calls runner..
 Owns state machine lifecycle. start, pause, resume, win, lose, restart.
 `GameEventRouter Subscribes bridge events, writes event queue..

. Fix RulesSystem duplicate initialization

 Action executors constructor `initialize(. instances dead.

Remove constructor executor. create `initialize(.

. Extract shared Godot bridge base

 `GodotBridge. native.. web. near-identical logic.



/lib/godot
 GodotBridgeBase. Shared logic management, state tracking, method signatures
 GodotBridge. native.-specific transport
..-specific transport




 Phase C Shared Types Cleanup

. Eliminate duplicate type re-exports `shared/src/types/index.

 Lines 28-61 re-export. Remove redundant named exports.

. Split `GameDefinition. (545 lines

 Extract nested types dedicated files

/src/types
 GameDefinition. lines Root type metadata
 world-config.,
 ui-config., VariableDisplay
 input-config. InputConfig,,
 audio-config. SoundConfig
 persistence-config. PersistenceConfig, AutoSave




 Phase D Dead Code Removal

. Remove confirmed dead code

Item Action

 `munim-bluetooth-peripheral Remove/package.
 `installedProcedure. Remove deprecated procedure
 Duplicate executor creation constructor Remove constructor
 Daily login bonus (DISABLED Remove reactivation
 Gem service (disconnected Remove use

. Clean up in-progress deletions

 ~80 deleted docs games, cleanup.



 Phase E Test Coverage Refactoring

. Tests newly-split modules

 module Phases A-C 5-15 unit tests

 Test Focus

. CRUD operations, validation
-packs. Pack creation, entry management
 `generation-jobs. Job lifecycle, error handling
-state-machine. transitions, invalid transition rejection
-event-store., replay,
-recovery. Lease acquisition, expiry, attempts
 `GameInitializer. Setup sequence, error cases
 `GameInputCollector. Input normalization, platform differences
 `GameLifecycleManager. state transitions

. Test priorities untested code

Priority Module Rationale

 `RulesSystem. Core game logic, 1 test file
 `WalletService. Financial operations
 `GodotBridge. 1 test 21 files
 `EntityManager. Core state management
 React components Integration-test runtime



 Migration Order

 Step API Asset System Split A1)
 Low file reorganization
 Files, 1 modified
-system tests pass

 RunCoordinatorDO Split A2)
 Medium Object lifecycle nuanced
 Files, 1 refactored
 Agent run tests pass, WebSocket functionality

 Agent Runs Route Split A3)
 Low service extraction
 2 created, 1 modified
 run route tests

 Dead Code Removal D
 removing unused code
 modified
 Type-check passes,

 5 Shared Types Cleanup (Phase C)
 Low-Medium consumers
 Files ~8 created/modified
 Verification --noEmit workspaces

 Step 6 GameRuntime Decomposition (Phase B1)
 Medium-High core game loop
 Files, 1 refactored
 Games load play test 9 games

Step 7 RulesSystem Fix Bridge Extraction B2-B3)
 Risk Medium behavioral components
 Files touched ~4 created
 Rule evaluation tests pass, games play web native

 Step 8 Test Coverage E)
 Risk None additive
 Files touched ~15 created
 new tests pass



 Architecture Change

. 6-phase system,
. React Query working
. Workers D1 R2 deployment appropriate scale
. Objects agent good
.-specific file. native.. web. standard pattern
. JSON product's data model
. working integration
. idempotency well-designed
