
## 2026-02-18: Web-Admin Content Review Page

### Page Structure
- Created `app/app/(web-admin)/admin/content-review.tsx` for reviewing party content.
- Used `trpcReact` for data fetching and mutations.
- Implemented web-only features like `<select>` (wrapped in `WebSelect`) and `new Audio().play()`.
- Used `StyleSheet.create` for styling to match existing admin dashboard patterns.
- Handled pagination and filtering state with `useState`.
- Parsed JSON body for preview.
- Added star rating component for quality and humor scores.

### React Native Web Patterns
- Use `Platform.OS === 'web'` guard for web-only components.
- Use `createElement` or direct HTML elements (like `<select>`) in `.tsx` files for web-only features, but be careful with types.
- Use `StyleSheet.create` for consistent styling across platforms (even if page is web-only).
- Use `TouchableOpacity` for interactive elements.
- Use `ScrollView` for scrollable content.
