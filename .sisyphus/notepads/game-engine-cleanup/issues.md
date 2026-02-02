# Issues - Game Engine Cleanup

Problems encountered and gotchas.

---

## Task 3.3 - Remaining Test File Updates

The core refactoring is complete (types, schemas, evaluators, game definitions all migrated), but the test file `app/lib/game-engine/__tests__/RulesSystem.test.ts` still needs manual updates:

- Replace `{ type: "score", operation: X, value: Y }` with `{ type: "set_variable", name: "score", operation: X, value: Y }`
- Replace `{ type: "lives", operation: X, value: Y }` with `{ type: "set_variable", name: "lives", operation: X, value: Y }`
- Replace score triggers `{ type: "score", threshold: X, comparison: Y }` with expression-based alternatives
- Replace score conditions `{ type: "score", min: X, max: Y }` with expression-based alternatives

Also need to update:
- `app/lib/test-games/archive/bubbleShooter/game.ts` - has score actions
- `app/lib/test-games/archive/memoryMatch/game.ts` - has score actions

These are straightforward mechanical changes following the same pattern as the other game files.
