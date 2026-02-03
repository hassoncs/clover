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
# Virtual Bundle System Learnings

## FileReader Abstraction
- Created `FileReader` interface to decouple bundle compiler from Node.js `fs`.
- `NodeFileReader` provides a thin wrapper around Node's synchronous `fs` API.
- `VirtualFileReader` enables in-memory bundle compilation by simulating a filesystem from a `Map<string, string>`.
- `VirtualFileReader` requires an absolute `bundleRoot` to correctly resolve absolute paths used by the compiler.
- Path normalization is critical when comparing absolute paths to the `bundleRoot` and when looking up relative keys in the file map.
- `readdirSync` in `VirtualFileReader` correctly identifies subdirectories by checking for path separators in the map keys.
# FileReader Implementation Learnings

## VirtualFileReader Path Resolution
- `bundleRoot` must be absolute to ensure consistent path resolution.
- `path.relative` is used to strip the `bundleRoot` and get keys for the internal `Map`.
- Directory simulation in `readdirSync` is achieved by splitting relative paths and tracking unique first segments.
- `existsSync` and `statSync` also handle directory detection by checking if any file keys start with the path as a prefix.

## Interface Design
- The `FileReader` interface is strictly synchronous to match the existing `compiler.ts` patterns.
- `Dirent` and `StatResult` abstractions allow `VirtualFileReader` to mimic Node.js `fs` behavior without real file system access.
- `NodeFileReader` is a thin wrapper around `fs`, facilitating easy swapping in the compiler.

## Testing
- Vitest is used for testing in the `shared` package.
- Explicit imports for `describe`, `it`, `expect` from `vitest` are required in this environment to avoid LSP errors and ensure test runner compatibility.

## RawBundleData and GameDefinition Type Updates
- Successfully added `scripts: Record<string, string> | null` to `RawBundleData`.
- Updated `RawBundleData.assets` to support `remoteUrl` and `localPath` alongside legacy `path`.
- Added `localPath` to `ImageField` in `GameDefinition.ts` to support local asset resolution across the engine.
- Expanded `CompileErrorCode` and `CompileWarningCode` with script and asset-specific codes.

## Compiler Refactoring (Task 2)

### FileReader Integration
- Successfully refactored `compiler.ts` to accept `FileReader` dependency via options parameter.
- Signature: `compileBundle(bundlePath: string, options?: { fileReader?: FileReader })`
- Defaults to `new NodeFileReader()` for backwards compatibility - existing code works unchanged.
- All helper functions (`scanForJsonFiles`, `readJsonFile`) now accept `fileReader` parameter.

### Replacement Pattern
All `fs.*` calls replaced with `fileReader.*` equivalents:
- `fs.readFileSync(path, 'utf-8')` → `fileReader.readFileSync(path)`
- `fs.readdirSync(dir, { withFileTypes: true })` → `fileReader.readdirSync(dir)`
- `fs.existsSync(path)` → `fileReader.existsSync(path)`
- `fs.statSync(path)` → `fileReader.statSync(path)`

### Loader Updates
- `isBundleDirectory(dirPath, fileReader = new NodeFileReader())` - optional parameter with default
- `loadBundleSync(bundlePath, options?: { fileReader?: FileReader })` - passes through to compiler

### Verification
- All FileReader tests pass (13/13)
- No new TypeScript errors introduced in modified files
- Backwards compatibility maintained - existing callers work without changes
- Virtual file system support now available for in-memory bundle compilation

### Key Insight
The refactoring maintains a clean separation: `fs` import remains in compiler.ts but is only used by `NodeFileReader`. The compiler itself is now filesystem-agnostic and can work with any `FileReader` implementation.

## Compiler Refactoring to Use FileReader (2026-02-03)
- Refactored `compiler.ts` to accept optional `FileReader` dependency via `options` parameter.
- Updated `compileBundle(bundlePath, options?: { fileReader?: FileReader })` signature.
- All helper functions (`scanForJsonFiles`, `readJsonFile`) now accept `fileReader` parameter.
- Replaced all direct `fs.*` calls with `fileReader.*` equivalents throughout compiler.
- Default behavior: `new NodeFileReader()` for backwards compatibility.
- Updated `loader.ts` functions (`isBundleDirectory`, `loadBundleSync`) to accept optional `fileReader`.
- Removed direct `fs` import from `loader.ts` (now uses FileReader abstraction).
- All tests pass with no breaking changes to existing API.
- Grep verification confirms zero direct `fs.` calls remain (except import statement).
