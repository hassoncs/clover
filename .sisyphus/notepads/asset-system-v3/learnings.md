
## Task 14: Offline UI Components
- Created `DownloadForOfflineButton` component with download/delete/progress states.
- Created `OfflineSettingsScreen` with toggle, storage usage, and game management.
- Used `expo-file-system` for native file operations (via download-manager).
- Used `AsyncStorage` for persisting offline settings.
- Pattern: Check platform (web vs native) and disable offline features on web.
- Pattern: Use `Ionicons` from `@expo/vector-icons` for consistent UI.
- Pattern: Use `Alert` for confirmation dialogs on native.
