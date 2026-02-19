
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
