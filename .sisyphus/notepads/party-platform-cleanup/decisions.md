## Decisions
- Decided to remove `isReconnect` parameter because the logic inside `handlePlayerConnect` already correctly identifies reconnects via `this.players.get(playerId)`.
- Renamed `QuiplashDefinition` to `PartyGameDefinition` for better semantic accuracy.
