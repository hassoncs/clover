# Decisions - Design-First Skia Canvas Editor

## [2026-02-26] Session ses_3682ff736ffeXsqVDzvJsE6Tj5 - Initial

### Architecture Decisions (from plan)
- Design docs are file-based (`design.json`) and separate from `GameDefinition`
- AI-first editing loop (not full Figma drag/drop)
- Skia rendering for design canvas (cross-platform)
- Pipeline: planning -> design -> design-iterate -> build -> ...
- T12 (design stage in execution engine) has no blockers per dependency matrix but plan places it in Wave 3 - following wave structure as written

### Wave Execution Order
1. Wave 1: T1, T2, T3, T4, T5 (all parallel)
2. Wave 2: T6, T7 (need T1); T9, T10 (need T3); T8 (needs T4+T6+T7); T11 (needs T6+T7)
3. Wave 3: T12 (no deps), T13 (needs T1+T2+T12), T14, T15, T16
4. Wave 4: T17, T18, T19, T20
5. Final: F1-F4

## Design Schema Validation
- Decided to use `zod` for schema validation as it is already a dependency in the `shared` package and widely used for other types.
- Chose to throw a custom `DesignSchemaError` for invalid documents to provide clear feedback to callers.
- Implemented a strict version check before full schema validation to provide a specific "unsupported version" error message.
- Decided to integrate `useDesignDocument` directly into `useWorkspaceFiles` to simplify access via `useSharedWorkspaceFiles`.
