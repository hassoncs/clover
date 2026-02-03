## Bundle Type System Updates (2026-02-03)
- Added `scripts` field to `RawBundleData` to support multi-file scripts in bundles.
- Enhanced asset resolution types in `RawBundleData` and `ImageField` to support `remoteUrl` and `localPath`.
- Added new `CompileErrorCode` and `CompileWarningCode` for script and asset validation.
- Updated `compileBundle` to load `scripts.json` and handle the new asset structure.
- Maintained backwards compatibility by keeping `path` as an optional field in asset definitions.

## Script Compilation in Build Pipeline
- Added support for optional `script.ts` in game directories.
- Scripts are compiled using `tsc` to CommonJS/ES2020.
- Output is placed in `.bundle/scripts/game.js` to match runtime expectations.
- Watch mode now tracks both `game.ts` and `script.ts`.
- Compilation errors in scripts are logged but do not halt the entire build process.
## Game Bundle Build Script Extensions

- Added support for compiling `script.ts` to `scripts/game.js` in the game bundle.
- Uses `npx tsc` with CommonJS output to match `ScriptSandbox` expectations.
- Watch mode now monitors both `game.ts` and `script.ts`.
- Fixed an issue where multi-line strings in `tsx --eval` caused syntax errors on some platforms/versions. Switched to single-line script for robustness.
