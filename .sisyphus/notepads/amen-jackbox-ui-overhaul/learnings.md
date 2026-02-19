
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
