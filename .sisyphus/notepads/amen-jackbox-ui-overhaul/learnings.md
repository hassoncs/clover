
## W1.3 — How to Play Screen (2026-02-19)
- Implemented `how-to-play/[templateId].tsx` route with `TutorialPager` and `TutorialStep` components.
- Added `arrowLeft` and `arrowRight` to `packages/ui/src/amen/icons/registry.ts` mapped to `arrow-left` and `arrow-right` (MDI).
- Used `FlatList` with `pagingEnabled` for the tutorial pager.
- Gotcha: `trpcReact` client types were missing `howToPlaySteps` on `PartyTemplate` (likely stale codegen), so I had to cast the result to `PartyTemplate` manually.
- Used `SafeAreaView` and `Stack.Screen options={{ headerShown: false }}` for full-screen layout.
- Styled with Amen palette: Navy `#1B3A6B`, Gold `#C9A84C`, Cream `#FFFDF7`.

## W2.3 — Game Settings Sheet (2026-02-19)
- Implemented `GameSettingsSheet` with `react-native-reanimated` for smooth entry/exit.
- Added `GameConfig` to `shared/types/party.ts` and propagated it through `api/src/party/protocol.ts`.
- Updated `PartyRoomDO` to persist `gameConfig` in room state and shared data.
- Updated `PartyContext` to manage local `gameConfig` state before starting the game.
- Wired up the settings button in `host.tsx`.
- Note: `GameConfig` defaults are hardcoded in `PartyContext` for now.

## W3.2 — Wire Text Games (2026-02-19)
- Created 4 new phase files: `quiplashPhases.tsx`, `halfAndHalfPhases.tsx`, `truthTrapPhases.tsx`, `yearJinxPhases.tsx`.
- Template keys: `quiplash`, `half-and-half`, `truth-trap`, `year-jinx`.
- Phase names per game:
  - quiplash: `answering` → `reveal` → `voting` → `round_results` → `scores` → `winner`
  - half-and-half: `drafting` → `voting` → `reveal` → `scores` → `winner`
  - truth-trap: `writing_lies` → `voting` → `reveal` → `scores` → `winner`
  - year-jinx: `round_start` → `guessing` → `reveal` → `scores` → `winner`
- `sharedData.gameTemplate` is used by `PartyGameRenderer` to look up the phase registry — no changes needed to the renderer.
- Quiplash `scoreboardJson` format: `[{playerName, score}]` (from `party.createScoreboard()`). Others use `scoreboard: [{id, name, score}]` (direct array).
- `FinalPodium` is shown at the `winner` phase for all 4 games, with `usePartyNarration` calling "Well done, good and faithful servant!" on mount.
- `RoundScoreBoard` used for `scores` phase; `scoreDelta: 0` for all players (server does not send delta).
- `AnswerRevealSequence` used for quiplash `reveal` (pre-vote, anonymous A/B labels) and truth-trap `reveal` (sorted truth-first).
- `VoteTally` used for quiplash `round_results` to show vote percentages after voting.
- All 4 phase files registered in `apps/amen/app/party/play.tsx`.
- Gotcha: `usePartyNarration` depends on `trpc.partyTemplates.generateNarration` which requires the API to be running with rebuilt types.

## W3.3 — Wire Remaining Games (2026-02-19)
- **quickfire-qa phases**: `question`, `reveal`, `scores` — replaced `scores` with `FinalPodium`.
- **consensus-mine phases**: `survey`, `team_turns`, `winner` — replaced `winner` with `FinalPodium`. Teams mapped as players `{ name: teamNames.diggers/drillers, score }`. No `VoteTally` wired — game has no natural reveal phase for vote distribution (master list items use rank/score, not raw vote count).
- **drawful-animate phases**: `reveal` → `AnimationFlipPreview` + `AnswerRevealSequence` (vote counts computed from `results.votes` by matching `votedText` against title text). `scores` → `RoundScoreBoard`. `winner` → `FinalPodium`.
- **heads-up phases**: `round_results` + `scores` both → `RoundScoreBoard` with `scoreDelta: 0`. `winner` → `FinalPodium`. Removed unused `parseHistory`, `outcomeDetail`, `HistoryEntry` type.
- **Pattern**: Full-screen result components (`FinalPodium`, `RoundScoreBoard`, `AnswerRevealSequence`) return directly without `PhaseShell` wrapper — they own their full layout.
- **Pattern**: `scoreDelta: 0` is valid — `RoundScoreBoard` only renders `+delta` when `> 0`.
- **Pattern**: Narration uses `narratedRef` + `isHost` guard in `useEffect` to prevent duplicate API calls from multiple player devices.
