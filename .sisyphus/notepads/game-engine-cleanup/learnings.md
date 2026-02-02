# Learnings - Game Engine Cleanup

Conventions, patterns, and things that worked.

---

## Task 1.1: Delete Slot Machine Code
- Successfully removed `SlotMachineConfig`, `PayoutConfig`, `FreeSpinsConfig`, and `PickBonusConfig` from `shared/src/types/GameDefinition.ts`.
- Cleaned up `shared/src/bundle/compiler.ts` and fixed an incorrect import for `ContainerConfig`.
- Removed broken `slotMachine` imports and config entries from `api/scripts/game-configs/index.ts`.
- Deleted auto-generated documentation files in `packages/docs/` and cleaned up references in `README.md` and `GameDefinition.md`.
- Cleaned up historical references in `docs/` and `scripts/convert-entity-components.mjs`.
- Verified removal with `rg "slotMachine|SlotMachine"` which now returns zero results.
