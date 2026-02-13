---
id: TASK-13
title: 'StyleSheet → NativeWind Migration: Pre-work'
status: Done
assignee: []
created_date: '2026-02-13 06:59'
updated_date: '2026-02-13 07:02'
labels:
  - refactor
  - nativewind
  - theme
milestone: StyleSheet Migration
dependencies: []
references:
  - .sisyphus/plans/stylesheet-to-nativewind-migration.md
  - packages/theme/src/tokens.ts
  - packages/theme/src/tailwind.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context

After analyzing the codebase, here's what I found:

### Theme prefix mystery - RESOLVED
The codebase uses `bg-theme-*` classes extensively (94 occurrences across 12 files). These work because:
- `jsxImportSource: 'nativewind'` in babel.config.js enables the className syntax
- NativeWind v4 automatically handles these utility classes
- Classes used: `bg-theme-surface`, `bg-theme-surface-elevated`, `bg-theme-primary`, `bg-theme-background`, `bg-theme-border`, `bg-theme-text`, `bg-theme-text-muted`, `bg-theme-success`, `bg-theme-warning`, `bg-theme-error`

### Indigo vs Sky - NEEDS DECISION
- Tokens define `primary` as `#0ea5e9` (sky blue)
- But codebase uses indigo `#6366F1` everywhere in actual code
- The tokens also include `accent` which maps to secondary[100]/secondary[900]
- Editor uses `ed-*` colors backed by CSS variables for theme switching

### Color Mapping Summary
Use these mappings when converting hardcoded colors:

| Hardcoded | Semantic Class |
|-----------|----------------|
| `#FFFFFF` | `bg-white` / `text-white` |
| `#000000` | `bg-black` / `text-black` |
| `#111827` | `text-theme-text` (primary text) |
| `#1F2937` | `bg-secondary-900` |
| `#374151` | `bg-secondary-700` |
| `#6B7280` | `text-secondary-500` |
| `#9CA3AF` | `text-secondary-400` |
| `#D1D5DB` | `text-secondary-300` |
| `#6366F1` | `bg-theme-primary` (indigo) |
| `#EF4444` | `text-theme-error` |
| `#10B981` | `text-theme-success` |
| `#F59E0B` | `text-theme-warning` |

### Files ready for conversion
See TASK-14 through TASK-18 for file lists grouped by complexity.
<!-- SECTION:DESCRIPTION:END -->
