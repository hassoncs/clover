
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

## Task 7: Platform-specific audio capture refactor

### Key learnings:
- **Vitest doesn't resolve `.native.ts`/`.web.ts` platform extensions** — need a base `audioCapture.ts` file that re-exports from `.web.ts` for Vitest to resolve. Metro still picks the correct platform file at build time.
- **`vi.mock` hoisting doesn't prevent Vite resolver failures** — even though `vi.mock('../audioCapture')` is hoisted, Vite's resolver still needs to find the actual module path for the source file being tested. The mock only intercepts the import in the test file.
- **Pattern: base `.ts` re-exports from `.web.ts`** — this is the cleanest approach for platform-specific files that need to work in Vitest. The base file serves as the default/web implementation.
- **`startAudioCapture` on web is async (getUserMedia returns Promise), native is sync** — both can be called with `await` safely since awaiting a sync function is a no-op.
- **Float32 to Int16 PCM conversion** for Web Audio API: `s < 0 ? s * 0x8000 : s * 0x7FFF` where s is clamped to [-1, 1].
- **ScriptProcessorNode** is deprecated but widely supported — AudioWorklet is the modern replacement but requires a separate worklet file.

## Task 9: EditorToolbar Refactor
- Replaced raw `TextInput` + send button with shared `ChatTextArea` component.
- Enabled `enableSpeechToText` prop to show the mic button in the toolbar.
- Removed unused `useState` and styles.
- Verified TypeScript check passes for `EditorToolbar.tsx`.
