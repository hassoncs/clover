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

## Script File Scanning (Task 4)

### Implementation Details
- Added `scanForScriptFiles(dir, fileReader, warnings)` function
  - Scans `scripts/` subdirectory for `.js` files
  - Returns array sorted alphabetically by basename
  - Emits `NESTED_SCRIPTS_IGNORED` warning for subdirectories
  
- Added `readScriptFile(filePath, fileReader)` function
  - Validates UTF-8 encoding (implicit via readFileSync)
  - HARD FAIL: Missing exports pattern (`/exports\.\w+\s*=/`)
  - HARD FAIL: Top-level return statement (`/^\s*return\s/m`)
  - Returns `{ content: string; error?: CompileError }`

- Updated `compileBundle` to process scripts:
  - Calls `scanForScriptFiles` after JSON scanning
  - Populates `rawData.scripts` with script contents (keyed by filename without extension)
  - Detects duplicate exports across files (emits `DUPLICATE_EXPORT` warning)
  - Concatenates scripts with separator format: `// --- ${basename} ---\n`
  - Sets `gameDefinition.script` field with concatenated content

### Script Concatenation Rules
- Sort alphabetically by basename (case-sensitive via `localeCompare`)
- Separator: `// --- ${basename} ---\n` BEFORE each script
- Duplicate export detection: warns but includes both files

### Test Coverage
All 8 tests pass:
1. Single script file processing
2. Script without exports (SCRIPT_SYNTAX_ERROR)
3. Empty scripts directory
4. Multiple scripts concatenated alphabetically
5. Duplicate export warning
6. Nested directory warning
7. Top-level return rejection
8. Multiple exports in single file

### Key Patterns
- Script validation is read-only (no execution)
- Flat `scripts/` directory only (no nesting)
- `.js` files only (no TypeScript)
- Regex-based validation (no JavaScript parser)
- Processed files tracked in `processedFiles` array


## Script File Scanning (Task 4 - 2026-02-03)

### Implementation
- Added `scanForScriptFiles()` to discover `.js` files in `scripts/` directory
- Scans only top-level `scripts/` directory (no nested directories)
- Returns files sorted alphabetically by basename
- Emits `NESTED_SCRIPTS_IGNORED` warning for subdirectories

### Script Validation
- `readScriptFile()` validates scripts using regex patterns (no parsing)
- Required: At least one `exports.` pattern (`/exports\.\w+\s*=/`)
- Forbidden: Top-level return statements (`/^\s*return\s/m`)
- UTF-8 validation via `readFileSync` success

### Script Processing
- Scripts concatenated into `gameDefinition.script` with separators
- Separator format: `// --- ${basename} ---\n`
- `rawData.scripts` populated with Map of basename → content
- Export conflict detection tracks which file defines each export
- Duplicate exports emit `DUPLICATE_EXPORT` warning (last file wins)

### Test Coverage
- 8 comprehensive tests covering all scenarios
- All tests pass using `VirtualFileReader` with relative path keys
- Tests verify: single script, multiple scripts, validation errors, warnings, empty directory

### Key Patterns
- Map keys in `VirtualFileReader` must be relative paths (e.g., `'scripts/game.js'`, not `'/bundle/scripts/game.js'`)
- Script processing happens after JSON scanning but before final GameDefinition build
- Processed script files added to `processedFiles` array for tracking

## Asset Resolution Implementation (2026-02-03)

### Key Implementation Details
- Added `scanForAssetFiles()` function to scan `assets/` directory for image/sound files
- Supported extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.mp3`, `.wav`, `.ogg`
- Function returns relative paths sorted alphabetically

### Asset Path Convention
- `localPath` in `assets.json` is relative to the `assets/` directory
- Example: `{ localPath: "ball.png" }` refers to `assets/ball.png` in the bundle
- Compiler validates by checking `path.join(bundlePath, 'assets', asset.localPath)`

### Dual-Field Asset Support
- `buildGameDefinition()` now outputs both `imageUrl` and `localPath` when available
- Legacy `path` field treated as `remoteUrl` for backwards compatibility
- Output format: `{ imageUrl: asset.remoteUrl || asset.path, localPath: asset.localPath }`

### Asset Validation Rules
1. **INVALID_ASSET_REFERENCE**: Asset must have at least one of `path`, `remoteUrl`, or `localPath`
2. **MISSING_LOCAL_ASSET**: If `localPath` declared, file must exist in `assets/` directory
3. Validation happens after JSON loading, before `buildGameDefinition()`

### Test Coverage
- Created comprehensive test suite in `asset-resolution.test.ts`
- Tests cover: local-only, remote-only, dual-mode, missing files, invalid references, legacy format
- All 7 tests pass, including VirtualFileReader integration

### Forward Compatibility
- Runtime does not yet support `localPath` - will use `imageUrl` until future update
- Compiler outputs both fields to enable independent deployment
- Games built with `localPath` will work (using remote) until runtime update

## Asset Resolution Implementation (Task 7)

### Implementation Summary
Added comprehensive asset resolution to the bundle compiler supporting both local and remote assets:

1. **scanForAssetFiles() function**:
   - Scans `assets/` subdirectory recursively
   - Supports image formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
   - Supports audio formats: `.mp3`, `.wav`, `.ogg`
   - Returns sorted array of relative paths (relative to `assets/` directory)

2. **Asset Format Support**:
   - **Legacy format**: `path` field (treated as `remoteUrl` for backwards compatibility)
   - **New format**: `remoteUrl` and/or `localPath` fields
   - Output includes both `imageUrl` and `localPath` when available

3. **Validation**:
   - `INVALID_ASSET_REFERENCE`: Asset must have `path`, `remoteUrl`, or `localPath`
   - `MISSING_LOCAL_ASSET`: When `localPath` declared but file doesn't exist at `assets/{localPath}`
   - Validation checks actual file existence using FileReader abstraction

4. **Test Coverage**:
   - 7 comprehensive tests covering all scenarios
   - Tests use VirtualFileReader for isolated testing
   - All tests passing

### Key Design Decisions

**localPath is relative to assets/ directory**:
- Asset declares: `localPath: 'ball.png'`
- Compiler checks: `{bundlePath}/assets/ball.png`
- This keeps asset declarations clean and portable

**Backwards compatibility maintained**:
- Old bundles with `path` field continue to work
- `path` is treated as `remoteUrl` in output
- No breaking changes to existing games

**Non-fatal errors**:
- Asset validation errors don't stop compilation
- Missing assets are excluded from output
- Allows partial compilation for debugging

### Testing Notes

**VirtualFileReader path handling**:
- Files stored with normalized paths (no leading slash)
- `existsSync()` correctly handles absolute paths via `getRelativePath()`
- Directory existence inferred from file paths

**Test file structure**:
```
files.set('assets/ball.png', 'data')  // File in virtual FS
localPath: 'ball.png'                  // Relative to assets/
Check: /bundle/assets/ball.png         // Absolute path for validation
```

### Commit
- Commit: ac08efb5
- Message: `feat(bundle): add asset resolution for local and remote assets`
- All bundle tests passing (28 tests)

## Plan Completion (2026-02-03)

### All Tasks Complete

Wave 1 (Foundation):
- Task 1: FileReader Interface - NodeFileReader + VirtualFileReader
- Task 2: Compiler Refactor - All fs calls replaced with FileReader
- Task 3: Type Updates - RawBundleData with scripts and asset resolution
- Task 4: Script Scanning - Concatenation with validation

Wave 2 (Features):
- Task 5: ballSortScripted Conversion - Pure bundle format
- Task 6: Build Script - TypeScript compilation support
- Task 7: Asset Resolution - Dual-mode (remote + local)
- Task 8: Integration Tests - 28 tests passing

### Final Verification
Test Files: 3 passed (3)
Tests: 28 passed (28)
Duration: ~300ms

### Commit
73a5567e feat(bundle): implement virtual bundle system

### System Ready For
- AI-generated games via VirtualFileReader
- Local TypeScript development with script.ts
- Bundle-only games (ballSortScripted working example)
- Dual-mode assets (CDN + local files)
- Future zip + CDN distribution

## Virtual Bundle Integration Tests (Task 8 - 2026-02-03)

### Test Coverage
Created comprehensive integration test suite with 9 test cases:
1. **Minimal bundle compilation** - Verifies basic VirtualFileReader + compileBundle integration
2. **Script concatenation** - Confirms alphabetical ordering (a_first, m_middle, z_last)
3. **Duplicate export warnings** - Tests DUPLICATE_EXPORT warning system
4. **Script validation** - Tests SCRIPT_SYNTAX_ERROR for missing exports
5. **Asset resolution** - Tests both local and remote asset handling
6. **Complete GameDefinition** - Validates all fields populated correctly
7. **Nested directory structure** - Tests complex multi-level bundle layout
8. **Missing local assets** - Tests MISSING_LOCAL_ASSET error handling
9. **Template reference validation** - Tests UNKNOWN_TEMPLATE error

### Helper Function Pattern
Created `createMinimalBundle(overrides)` helper that:
- Returns `Map<string, string>` for VirtualFileReader
- Provides minimal valid bundle (manifest, templates, rules)
- Accepts optional overrides for scripts, assets, manifest
- Automatically creates dummy asset files for `localPath` entries

### Key Testing Insights

**VirtualFileReader Constructor Order**:
```typescript
// CORRECT: bundleRoot first, files second
const fileReader = new VirtualFileReader('/virtual/test', files);
```

**Asset File Creation**:
When testing missing assets, must manually construct files Map instead of using `createMinimalBundle`, since the helper automatically adds dummy files for any `localPath`.

**Test Organization**:
- Section comments in complex tests improve readability
- Helper function docstring clarifies test setup purpose
- Each test focuses on single integration scenario

### Test Results
- All 9 integration tests pass
- Total bundle test suite: 37 tests passing
- No TypeScript errors
- Tests run in ~15ms

### Commit
Message: `test(bundle): add virtual bundle integration tests`

## Integration Test Patterns (2026-02-03)

### Test File Structure
- Created comprehensive integration tests at `shared/src/bundle/__tests__/virtual-bundle-integration.test.ts`
- 18 test cases covering all major compilation scenarios
- All tests use VirtualFileReader (no disk I/O)

### Helper Function Pattern
```typescript
const createMinimalBundle = (overrides?: {
  manifest?: Record<string, unknown>;
  templates?: unknown;
  rules?: unknown;
  scripts?: Record<string, string>;
  assets?: Record<string, unknown>;
}): Map<string, string>
```
- Provides minimal valid bundle structure
- Accepts overrides for specific test scenarios
- Automatically creates dummy asset files when localPath is specified

### Key Test Coverage
1. **Basic Compilation**: Minimal bundle → valid GameDefinition
2. **Script Concatenation**: Alphabetical ordering with separators
3. **Warnings**: Duplicate exports detection
4. **Errors**: Missing exports, malformed JSON, missing files
5. **Asset Resolution**: Both remoteUrl and localPath support
6. **Constant Resolution**: Reference resolution and error handling
7. **Validation**: Duplicate IDs, unknown templates, unknown assets
8. **Complex Structures**: Nested directories, multiple file types

### TypeScript Considerations
- AssetConfig extends ImageField (no `type` property directly)
- GameDefinition.rules is optional (use `rules!` after checking defined)
- VirtualFileReader requires absolute bundleRoot path

### Test Execution
- All 46 bundle tests pass (4 test files)
- No TypeScript errors in new test file
- Tests run in ~50ms total
