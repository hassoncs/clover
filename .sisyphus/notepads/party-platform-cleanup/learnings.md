## Cleanup Learnings
- Removed unused `isReconnect` parameter from `PartyRoomDO.ts`. Reconnection is handled by checking if the player ID already exists in the `players` map.
- Removed dead constant `SCRIPT_EXECUTION_TIMEOUT_MS` from `PartyRoomDO.ts`. The actual timeout is managed in `ServerScriptRunner.ts`.
- Renamed `QuiplashDefinition` to `PartyGameDefinition` to better reflect its usage across multiple game types.
- Removed deprecated `QuiplashPrompt` and `loadPromptPool` from `prompt-loader.ts` as they had no external consumers.
