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

### Concurrent File Modifications
- Encountered "File has been modified since it was last read" errors multiple times while editing `GameRuntime.godot.tsx`.
- This was likely due to the LSP or an auto-formatter running in the background, or potentially another agent working on a related task.
- Resolved by being more specific with `Edit` strings and retrying immediately after reading.
Encountered significant code duplication and syntax errors in GameRuntime.godot.tsx during cleanup.
- Multiple copies of useEffect and manualStep were present at the end of the file.
- Some copies were incomplete or broken, causing LSP errors.
- Fixed by identifying and removing the redundant blocks.

## Task 6.1 - Verification Findings
- `initialScore` and `initialLives` patterns were found to be almost entirely removed, with only one instance remaining in an archive file: `app/lib/test-games/archive/angryBurns/AngryBurnsFavoritesBrowser.tsx`.
- All other targeted legacy patterns (`game.rulesEvaluator`, `getRulesEvaluator`, `scoreChanged`, `livesChanged`, `setCallbacks`, `ScoreAction`, `LivesAction`, `ScoreTrigger`, `ScoreCondition`, `score_below`, `lives_zero`, `Match3Callbacks`) have been successfully removed (0 results in grep).
