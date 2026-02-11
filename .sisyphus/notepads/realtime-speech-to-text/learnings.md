
## Task 8: ChatTextArea Integration

### Test Framework (App)
- **Framework**: Vitest (v2.1.9) with `jsdom` environment
- **Config**: `app/vitest.config.mjs`
- **Setup**: `app/vitest.setup.ts`
- **Testing Library**: `@testing-library/react` (v16.3.2) works best with `react-native-web` alias
- **React Native Web**: Aliased in `vitest.config.mjs` to `react-native-web`
- **Mocking**: `vi.mock('react-native', ...)` works but requires careful handling of `Pressable` and other components if deep interaction testing is needed.
- **Event Handling**: `fireEvent.mouseDown` / `fireEvent.mouseUp` / `fireEvent.click` work with `react-native-web` components in JSDOM.
- **Accessibility**: `react-native-web` maps `accessibilityRole` to `role` and `accessibilityLabel` to `aria-label`.
- **TestID**: `react-native-web` maps `testID` to `data-testid` (lowercase). `getByTestId` expects `data-testid`.

### Component Implementation
- **ChatTextArea**: Integrated `MicButton` and `useSpeechToText` hook.
- **Prop**: Added `enableSpeechToText` prop (default false).
- **Hook**: Wired up `useSpeechToText` with `onTranscriptComplete` callback.
- **Display**: Input value shows `text + transcript` while recording.
- **Interaction**: Tapping mic button starts recording, stopping appends text.

### Verification
- **Tests**: 6 tests pass covering rendering (enabled/disabled), interaction (start recording), and transcription flow.
- **TypeScript**: Passed (with unrelated errors).
- **Commit**: `feat(app): integrate speech-to-text mic button into ChatTextArea`
