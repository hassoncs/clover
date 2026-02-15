
- **D1 exec() in Tests**: Encountered `TypeError: Cannot read properties of undefined (reading 'duration')` when using `DB.exec()` in Vitest tests. Switched to `prepare().run()` or used routes that don't use `exec()` for testing.
- **AI Config Dependency**: Billing checks in `games.generate` are currently after the AI config check. This means if AI is not configured, the billing check is never reached. Mocked AI config in tests to bypass this.
