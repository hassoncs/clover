## [2026-02-10] GodotJS Editor Crash: has_method assertion

**Severity**: BLOCKER for editor usage
**Error**: `FATAL: Condition "!(has_method(p_method))" is true` at `jsb_script.cpp:347`
**Impact**: Editor crashes on startup when any `.ts` file exists in the project

### Reproduction
1. Create any `.ts` file that `export default class X extends RefCounted`
2. Compile with esbuild to `.godot/GodotJS/`
3. Open GodotJS editor → CRASH (SIGABRT)

### Analysis
- GodotJS scans all `.ts` files and registers them as `GodotJSScript` classes
- During editor startup, it introspects all script classes
- `get_method_info()` calls `jsb_check(has_method(p_method))` which is a fatal assertion
- If the class doesn't have the expected method, the assertion fails and crashes

### Possible Causes
1. Missing GodotJS preset files (need "Install Preset Files" from GUI)
2. The TS class needs GodotJS-specific decorators for method registration
3. `RefCounted` base class may need special handling in GodotJS
4. The minimal type stubs may not provide enough information for GodotJS class registration

### Workaround
- None found — even `--recovery-mode` doesn't prevent the crash
- The crash happens before the editor UI loads

### Next Steps
- Try running "Install Preset Files" from a project WITHOUT the TS file
- Then add the TS file back after preset files are installed
- Check if GodotJS needs `@godot.annotations` decorators on the class
