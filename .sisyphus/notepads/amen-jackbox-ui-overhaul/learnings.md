
## W4.1 — Settings Screen (2026-02-19)
- Implemented `useAppSettings` hook using `zustand` and `persist` middleware with `AsyncStorage`.
- Created reusable `VolumeSlider` using `@react-native-community/slider` and `DenominationPicker` components.
- Built the settings screen with sections for Audio, Accessibility, Content, and Gameplay.
- Used `SectionOrnament` from `@slopcade/ui/amen` for section dividers.
- Added a gear icon to the browse screen header to access settings.
- Note: `SectionOrnament` only supports specific variants ("wheat", "olive", "dots", "stars").
- Note: `Stack.Screen` options in Expo Router are strict about valid properties (e.g., `headerBackTitleVisible` might not be supported in the type definition used).

## W2.1 — Avatar Picker (2026-02-19)
- Implemented `AvatarPicker` component with `react-native-reanimated` for selection animation.
- Added `bread` icon to `packages/ui/src/amen/icons/registry.ts` mapped to `bread-slice` (MDI).
- Updated `PartyRoomDO` to handle `avatar` in WebSocket connection params and store it in `PartyPlayer`.
- Updated `usePartyConnection` and `PartyContext` to pass `avatar` through the connection flow.
- Added Avatar Picker step to `apps/amen/app/join.tsx`.
- `PartyPlayer` type already had `avatar` field, so no changes needed in shared types.

## W1.2 — Detail Panel (2026-02-19)
- Created GameDetailPanel and GameMetaBadge components.
- Added 'clock' and 'alert' icons to Amen icon registry to support session length and content note badges.
- Used MotifDivider for visual separation.
- Implemented null state for when no game is selected.

## W2.2 — Host Lobby (2026-02-19)
- Implemented `PlayerChip` with `AmenIcon` support and fallback to initials.
- Created `LobbyCountdown` overlay with `react-native-reanimated` zoom animations.
- Upgraded `host.tsx` with game name header, player grid, and room code display.
- Added player-join SFX using `getAudioManager().playSfx("player-join")` inside a `useEffect` tracking `players.length`.
- Used `useParty()` hook to get `roomState`, `players`, `sendStartGame`, and `connectionStatus`.
- `PartyPlayer` has an `avatar` field which maps to `AmenIconName`.
