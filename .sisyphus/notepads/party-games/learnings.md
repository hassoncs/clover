# Role Replay Implementation Learnings

- **Party Game Pattern**: Followed the `about-you-bluff` pattern for server scripts.
- **Variable Declaration**: Strict adherence to `var` and top-level declarations in server scripts is required for the QuickJS sandbox.
- **Game Registration**: New party games must be imported as `definition.json` and registered in `api/src/party/templates/registry.ts`.
- **Build Process**: `api/scripts/sync-r2.ts` is used to compile `game.ts` or `manifest.json` + scripts into `definition.json`.
- **Private Info**: Used `room.sendToPlayer` to send secret traits to players privately.
- **Input Types**: Used `text` for confessionals and `choice` for guessing/voting.
