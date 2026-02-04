# Decisions

## ThemeEditorModal State Management
- Decided to include `visible` in `useEffect` dependency array to ensure form state resets when the modal is reopened, even if `editingTheme` hasn't changed (e.g. closing and reopening "New Theme" modal).
