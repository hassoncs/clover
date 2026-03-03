# Issues

## 2026-03-02 Session ses_34ff1de1cffey6f05cvPTlMD8E

### Potential Issues to Watch
- `useDesignImageResolver.ts` — need to check if it has any editor coupling
- `DesignCanvasPanel.native.tsx` — need to check its coupling (may be simpler than web version)
- The `useDesignInteractionsNative.ts` — need to check imports
- shader-editor has no `scripts/preflight-check.mjs` — pencil may not need one either (or we add one)
- shader-editor's metro.config.js has complex resolver logic for jotai/zustand/xyflow — pencil may need similar
