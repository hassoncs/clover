## AI Generation in Party Server Scripts
- The current `ServerScriptRunner` sandbox does not expose `ai-sdk-usage` or any AI generation tools to the `server.js` script.
- House Decoys must be pre-generated in the content pack metadata or handled by the runner before execution.
- For `truth-trap`, I used a placeholder/metadata-based approach for the House Decoy.
- Encountered an issue where `definition.json` was not correctly updated with the `party` field from `manifest.json`. Deleting the old `definition.json` and re-running the build script fixed it.
- The `read` tool and `tail` can be misleading when dealing with very long lines (like minified or large string fields in JSON).
