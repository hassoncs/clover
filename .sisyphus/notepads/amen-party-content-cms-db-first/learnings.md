
## 2026-02-18: Web-Admin Content Review Redesign

### Web-Only UI Patterns
- **HTML Elements**: In `Platform.OS === 'web'` guarded files, standard HTML elements (`<table>`, `<select>`, `<input>`) provide better density and native behavior than React Native equivalents for admin interfaces.
- **Styling**: While `StyleSheet.create` is good for layout, inline styles cast to `any` or `CSSProperties` are often necessary for web-specific attributes like `cursor: pointer`, `borderCollapse`, or `outline`.
- **Dark Mode**: For admin tools, a hardcoded dark theme (Slate palette: `#0f172a` bg, `#1e293b` panels) works well and feels professional without needing a full app-wide theme system.

### Data Fetching & State
- **Filter Handling**: Passing `undefined` to tRPC queries correctly omits the parameter, which is perfect for "All" filter states.
- **Error Loops**: Always set `{ retry: false }` on `useQuery` for admin pages to prevent infinite retry loops when a user gets a 403 Forbidden error.
- **Layout**: A fixed sidebar + scrollable main content area (`flex: 1` on both container and content) is a robust pattern for data-heavy admin views.
