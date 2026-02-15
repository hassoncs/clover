
## KnobSlider Implementation
- Created `KnobSlider` component in `packages/ui/src/Knobs/`.
- Used `@react-native-community/slider` for the slider control.
- Implemented tap-to-edit functionality using a conditional `TextInput`.
- Used `step` prop to determine decimal precision for display (heuristic: if step has decimals, use that precision; if step is integer, use 0; default to 2).
- Styled with NativeWind classes matching the dark theme (`bg-gray-900/95`, `text-white`, `text-purple-500`).
- Added Storybook stories for Default, WideRange, FineControl, Integer, and WithDescription variants.

## KnobControl Implementation
- Created `KnobControl` dispatcher component in `packages/ui/src/Knobs/KnobControl.tsx`.
- Implemented support for `slider`, `toggle`, `select`, `color`, `button`.
- Added placeholders for `vec2`, `vec3`, `gradient`, `text`.
- Created "Kitchen Sink" story in `packages/ui/src/Knobs/KnobControl.stories.tsx`.
- `KnobControl` requires `label` prop as `KnobConfig` does not contain it (it comes from `VariableWithTuning`).

## KnobVec3 Implementation
- Created `KnobVec3` component for editing 3D vectors (x, y, z).
- Used `Slider` from `@react-native-community/slider` for each axis.
- Implemented direct text input for precise value editing.
- Added default min/max values (-1 to 1) and step (0.1).
- Created Storybook stories for Default, Position (0-100), and With Description variants.

## KnobVec2 Implementation
- Created `KnobVec2` component for editing 2D vectors (x, y).
- Used `PanResponder` for a 2D touchpad interface.
- Implemented direct manipulation of the dot position.
- Added default min/max values (-1 to 1).
- Created Storybook stories for Default, Position (0-100), and With Description variants.

## KnobsPanel Implementation
- Implemented `KnobsPanel` using `@gorhom/bottom-sheet` v5.
- Used `BottomSheetScrollView` for scrollable content inside the sheet.
- Used `forwardRef` and `useImperativeHandle` to expose `open()` and `close()` methods.
- Grouped variables by category using `KnobCategoryGroup`.
- Used `inferKnob` to handle variables without explicit knob config.
- Created `KnobsFloatingButton` with `react-native-reanimated` for press animation.
- Storybook story uses `useState` to simulate variable updates.
- **Gotcha**: `GameVariable` category type is strict (`"physics" | "gameplay" | ...`), so mock data must conform or rely on fallback logic in the component.
