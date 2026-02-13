# Issues

(No issues recorded yet)

## 2026-02-12: livePreviewEnabled context refactor

### Completed
- Moved `livePreviewEnabled` state from `[id].tsx` local state + `useWorkspaceSnapshot` internal state → `EditorProvider` context
- `EditorProvider` now owns the storage read (`getStorageItem("livePreviewEnabled", false)`) and exposes `livePreviewEnabled` + `setLivePreviewEnabled`
- `useWorkspaceSnapshot` now accepts `livePreviewEnabled` as a 3rd parameter (default `false`) instead of managing it internally
- Removed `onLivePreviewChange` prop from: `ResponsiveEditorLayout`, `StageArea`, `StageContainer`
- `EditorTopBar` reads `livePreviewEnabled` from `useEditor()` context
- `StageContainer` reads `livePreviewEnabled` from `useEditor()` and passes it to `useWorkspaceSnapshot`

### Notes
- `[id].tsx` still calls `useWorkspaceSnapshot(resolvedGameId, null)` outside EditorProvider to get `setPreviewMode` — this works because `livePreviewEnabled` defaults to `false` and the controller won't initialize without a bridge anyway
- `setPreviewMode` and `onResetPreview` are still passed as props to `EditorTopBar` — these could be moved to context in a future pass but are not part of the circular prop drilling issue
- `tsc --noEmit` passes clean

## Editor Layout Testing Issues

### Authentication Blocker
- **Issue**: Unable to bypass authentication to access the editor page (`/editor/slopeggle`).
- **Behavior**: The app redirects to a login page (likely Supabase Auth UI) when accessing protected routes.
- **Attempted Workarounds**:
  - Setting `dev_authenticated` in `localStorage` failed to bypass auth.
  - `__DEV__` flag seems to be respected (API accepts `dev-token`), but frontend `useAuth` hook does not pick up the dev state automatically as expected.
  - "Login as Dev User" button is not visible on the login page rendered.

### Findings
- **Server Status**: Metro is running on port 8085.
- **Routing**: `app/app/editor/[id].tsx` exists and has an auth check that redirects to `/(tabs)/profile`.
- **Login UI**: The login page rendered seems to be different from `LoginScreen` in `profile.tsx` (shows password field), suggesting a different component or external auth UI is being shown.

### Recommendations
- Investigate why `loadDevAuthState` in `app/lib/auth/token.ts` is not automatically authenticating on web as intended.
- Verify if `Platform.OS === 'web'` check is working correctly in the build.
- Check if `LoginScreen` in `profile.tsx` is actually being rendered or if there is another redirect involved.
