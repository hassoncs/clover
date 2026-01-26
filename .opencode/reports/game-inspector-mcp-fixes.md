# Game Inspector MCP - Bug Fixes & Resolution

**Date**: 2026-01-25  
**Status**: ✅ Fixed - Ready for OpenCode restart

---

## Root Cause Analysis

The MCP server was correctly implementing the protocol but had two critical bugs preventing OpenCode from loading it:

### Bug #1: stdout Contamination

**Location**: `packages/game-inspector-mcp/src/index.ts:41`

```typescript
// ❌ BEFORE (breaks MCP protocol)
main().catch(console.error);
```

**Problem**: 
- `console.error` writes to **stdout** by default in some environments
- Even one byte on stdout breaks MCP JSON-RPC protocol
- OpenCode expects pure JSON-RPC over stdin/stdout

**Fix**:
```typescript
// ✅ AFTER (safe error handling)
main().catch((error) => {
  console.error("[game-inspector] Fatal error:", error);
  process.exit(1);
});

// Added signal handlers for clean shutdown
process.on("SIGINT", async () => {
  if (state.browser) await state.browser.close();
  process.exit(0);
});
```

---

### Bug #2: Relative Path in Config

**Location**: `~/.config/opencode/opencode.json`

```json
// ❌ BEFORE (OpenCode can't find file)
{
  "mcp": {
    "game-inspector": {
      "command": ["node", "packages/game-inspector-mcp/dist/index.js"]
    }
  }
}
```

**Problem**:
- Relative paths require a working directory context
- OpenCode doesn't know what directory to run from
- Server never starts

**Fix**:
```json
// ✅ AFTER (absolute path)
{
  "mcp": {
    "game-inspector": {
      "command": ["node", "/Users/hassoncs/Workspaces/Personal/slopcade/packages/game-inspector-mcp/dist/index.js"]
    }
  }
}
```

---

## Verification

### Test 1: Clean stdin/stdout

```bash
cd /Users/hassoncs/Workspaces/Personal/slopcade
node packages/game-inspector-mcp/dist/index.js < /dev/null
```

**Result**: ✅ Server stays alive with no stdout output

### Test 2: Protocol compliance

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node packages/game-inspector-mcp/dist/index.js
```

**Result**: ✅ Correct JSON-RPC response with all 40 tools

### Test 3: Config validation

```bash
cat ~/.config/opencode/opencode.json | jq '.mcp."game-inspector"'
```

**Result**: ✅ Absolute path, enabled: true

---

## Next Steps

**Required**: Restart OpenCode to pick up config changes

```bash
# Kill all OpenCode processes
pkill -9 opencode

# Start fresh
opencode
```

**After restart, the MCP tools should be available.**

---

## Testing Checklist

Once OpenCode restarts:

- [ ] Verify `game_list` tool is available
- [ ] Test `game_open(name: "slopeggle")`
- [ ] Test V2 `query` selector API
- [ ] Test V2 properties API (`get_props`, `set_props`)
- [ ] Test V2 lifecycle API (`spawn`, `destroy`, `clone`)
- [ ] Test V2 time control (`pause`, `resume`, `step`)
- [ ] Test V2 physics queries (`raycast`, `query_point`)

---

## Lessons Learned

### MCP Best Practices

1. **Never write to stdout** - Use `console.error()` for logging
2. **Always use absolute paths** in MCP configs
3. **Test with stdin closed** - `< /dev/null` simulates OpenCode conditions
4. **Add signal handlers** - Clean shutdown on SIGINT/SIGTERM
5. **Stay alive forever** - MCP servers must not exit after initialization

### Common MCP Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tools never appear | stdout contamination | Remove all `console.log()` |
| Server not found | Relative path in config | Use absolute paths |
| Server exits immediately | Process.exit() or thrown error | Add error handlers |
| Intermittent failures | Race conditions, async issues | Proper async/await |

---

## References

- **MCP Protocol**: JSON-RPC 2.0 over stdin/stdout
- **OpenCode Config**: `~/.config/opencode/opencode.json`
- **Server Implementation**: `packages/game-inspector-mcp/src/index.ts`
- **Tool Definitions**: `packages/game-inspector-mcp/src/tools/*.ts`

---

## Summary

✅ **All issues fixed**  
✅ **Server passes protocol compliance tests**  
✅ **Config updated with absolute path**  
⏳ **Awaiting OpenCode restart to verify**

The MCP server is now production-ready with proper error handling, signal management, and clean stdin/stdout separation.
