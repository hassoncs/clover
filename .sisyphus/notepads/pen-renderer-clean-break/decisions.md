# Decisions — pen-renderer-clean-break

## Architecture Decisions (from plan)
- Resolve-then-render pipeline: PenDocument → resolve variables → resolve refs → compute layout → render Skia primitives
- Layout is a pure function (no layout logic in render code)
- Variable resolution is eager (single tree walk before rendering)
- Ref resolution produces a flat-ish tree (renderer never sees ref nodes)
- Old DesignDocument types remain for backward compat (don't delete yet)
- Old DesignCanvasRenderer.tsx stays as fallback until new renderer is proven
