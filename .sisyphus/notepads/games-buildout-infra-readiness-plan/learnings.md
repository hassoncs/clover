
## TokenComposer Implementation (2026-02-15)
- Created `TokenComposer.tsx` using `@mgcrea/react-native-dnd`.
- Implemented drag and drop logic for word bank and composition area.
- Used `runOnJS` to update state from `onDragEnd` worklet.
- Added styling for tokens and drop zones.
- Verified type check passes.

## Infrastructure Components Built (2026-02-15)

### InvestmentInput Component
- Uses `@react-native-community/slider` for budget allocation
- Fixed total budget with sliders for each option
- "All In" button allocates remaining budget to single option
- Submit only enabled when budget fully allocated (remaining = $0)
- Currency formatting with `Intl.NumberFormat`

### MatchingInput Component
- Uses `@mgcrea/react-native-dnd` with `DndProvider`, `Droppable`, `Draggable`
- Drag players to roles (exclusive assignment)
- `useActiveDropReaction` for visual feedback on drop zones
- `runOnJS` for state updates from worklets
- Submit only enabled when all roles filled

### Party Input Types
- Added `"investment"` and `"matching"` to `PartyInputType` union
- PartyGameRenderer handles each type with appropriate component
- Investment options passed via `metadata.options` and `metadata.totalBudget`
- Matching players/roles passed via `metadata.players` and `metadata.roles`

## Games Built This Session
- **punchline-ferry** (Wave 4): Collaborative joke construction with mic input
- Uses `text`, `mic`, `choice` input types
- Token Bank for shared funny words
- Three-stage joke building (setup, bridge, punchline)

## Key Patterns
- Party input components follow consistent pattern: `onSubmit`, `timeLimit`, `disabled` props
- Use NativeWind for styling (`className="..."`)
- Auto-submit on time limit with `useEffect` timer
- Haptic feedback on interactions (`expo-haptics`)
