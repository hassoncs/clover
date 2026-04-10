# Pencil Local Project Folder Layout

> Local-first project structure for Pencil design documents

## Overview

Pencil uses **project folders** as the primary persistence unit. Each project is a self-contained directory that can hold multiple documents, assets, and metadata. This design supports local-first workflows without requiring cloud accounts or hosted infrastructure.

## Folder Structure

```
my-project/                          # Project root (user-chosen name)
├── .pencil/                         # Pencil metadata & configuration (hidden)
│   ├── project.json                 # Project metadata
│   ├── state.json                   # Session state (open docs, UI preferences)
│   └── cache/                       # Local cache folder
│       ├── thumbnails/              # Auto-generated document thumbnails
│       └── exports/                 # Cached export artifacts
│
├── documents/                       # Design documents (.pen files)
│   ├── main-screen.pen              # Each .pen file is a standalone document
│   ├── settings-panel.pen
│   └── onboarding-flow.pen
│
├── assets/                          # Project-local assets (optional)
│   ├── images/                      # Imported images
│   │   ├── logo.png
│   │   └── background.jpg
│   ├── icons/                       # Icon sets or individual icons
│   │   └── tab-icons/
│   └── fonts/                       # Custom fonts (if/when supported)
│       └── Inter-Bold.ttf
│
└── exports/                         # Generated/exported outputs (optional)
    ├── png/                         # Exported PNGs
    ├── svg/                         # Exported SVGs
    └── code/                        # Generated code exports
        └── react-components/
```

## File Details

### `.pencil/project.json`

Project-level metadata. Created automatically when a folder is first opened as a Pencil project.

```json
{
  "version": 1,
  "createdAt": "2026-03-11T10:30:00Z",
  "lastOpenedAt": "2026-03-11T14:22:00Z",
  "name": "my-project",
  "id": "proj_abc123xyz"
}
```

**Fields:**
- `version`: Schema version for migrations
- `createdAt`: ISO timestamp of project creation
- `lastOpenedAt`: ISO timestamp of last open (for "recent projects")
- `name`: Display name (defaults to folder name)
- `id`: Stable project identifier (UUID)

### `.pencil/state.json`

Session state that persists across restarts but is user-specific (not shared).

```json
{
  "version": 1,
  "openDocuments": [
    {
      "path": "documents/main-screen.pen",
      "lastActiveAt": "2026-03-11T14:22:00Z",
      "viewport": { "x": 0, "y": 0, "zoom": 1.0 }
    }
  ],
  "activeDocumentPath": "documents/main-screen.pen",
  "ui": {
    "sidebarVisible": true,
    "sidebarWidth": 240,
    "chatVisible": true,
    "theme": "dark"
  }
}
```

**Fields:**
- `openDocuments`: Array of currently open documents with per-document state
- `activeDocumentPath`: Which document tab is active
- `ui`: User interface preferences

### `documents/*.pen`

Each `.pen` file is a self-contained design document in JSON format.

```json
{
  "version": 1,
  "id": "doc_xyz789",
  "name": "main-screen",
  "createdAt": "2026-03-11T10:30:00Z",
  "modifiedAt": "2026-03-11T14:22:00Z",
  "children": [
    // Document nodes (frames, text, etc.)
  ],
  "variables": {
    // Design tokens / variables
  },
  "assets": [
    // References to assets in ../assets/
    { "id": "asset_1", "path": "../assets/images/logo.png", "type": "image" }
  ]
}
```

**Naming conventions:**
- Use kebab-case for filenames: `main-screen.pen`, `settings-panel.pen`
- The `.pen` extension is required
- Files without `.pen` extension are ignored in the documents list

## Design Principles

### 1. Simple by Default

A project folder can be as simple as:

```
minimal-project/
├── .pencil/
│   └── project.json
└── documents/
    └── design.pen
```

Everything else is optional. Users can start with a single document and grow organically.

### 2. Self-Contained

All paths within a project are **relative**. Moving or renaming the project folder doesn't break internal references. Assets are referenced as `../assets/images/logo.png`, not absolute paths.

### 3. Version Control Friendly

The structure is designed for Git:

```
# .gitignore
cache/
exports/
```

- `documents/*.pen` → Track in Git (text files, diffable)
- `assets/` → Track binary assets or use Git LFS
- `.pencil/cache/` → Ignore (rebuildable)
- `exports/` → Ignore (generated outputs)

### 4. Multiple Documents Per Project

Projects support multiple documents, enabling:

- **Screen flows**: `onboarding-1.pen`, `onboarding-2.pen`, `home.pen`
- **Component libraries**: `buttons.pen`, `inputs.pen`, `cards.pen`
- **Responsive variants**: `mobile-layout.pen`, `desktop-layout.pen`

### 5. Extensible for Future Features

The structure leaves room for growth:

- **Components**: Add `components/` folder for shared component library
- **Libraries**: Add `libraries/` for external design system imports
- **Versions**: Add `versions/` for document versioning
- **Comments**: Add `comments/` for async design feedback

## Migration from Current Single-Document Model

### Current State

The existing Pencil app uses:
- `localStorage` key `pencil:last-document` for auto-save
- Single document with name stored separately
- Exports to `.pen.json` files

### Migration Path

1. **Phase 1**: Support opening `.pen` files directly (backward compatible)
2. **Phase 2**: Support opening folders as projects
3. **Phase 3**: Prompt users to organize loose `.pen` files into project folders

### Backward Compatibility

Single `.pen` files remain valid:

```bash
# These both work
pencil open my-design.pen              # Open single file (legacy mode)
pencil open my-project/                # Open project folder (new mode)
```

## Comparison: Project vs Single File

| Feature | Single File | Project Folder |
|---------|-------------|----------------|
| Multiple documents | ❌ | ✅ |
| Asset management | ❌ (external refs) | ✅ (local assets/) |
| Session persistence | Limited (localStorage) | Full (state.json) |
| Version control | Manual | Git-friendly structure |
| Team sharing | File sharing | Git collaboration |
| Offline-first | ✅ | ✅ |

## Examples

### Example 1: Simple Mobile App

```
my-app/
├── .pencil/
│   ├── project.json
│   └── state.json
├── documents/
│   ├── splash-screen.pen
│   ├── login.pen
│   ├── home.pen
│   └── settings.pen
└── assets/
    ├── images/
    │   ├── logo.png
    │   └── hero-bg.jpg
    └── icons/
        └── tab-bar/
```

### Example 2: Component Library

```
my-design-system/
├── .pencil/
│   └── project.json
├── documents/
│   ├── color-tokens.pen
│   ├── typography.pen
│   ├── buttons.pen
│   ├── inputs.pen
│   ├── cards.pen
│   └── navigation.pen
└── assets/
    └── fonts/
        ├── Inter-Regular.ttf
        └── Inter-Bold.ttf
```

### Example 3: Marketing Website

```
marketing-site/
├── .pencil/
│   └── project.json
├── documents/
│   ├── landing-page.pen
│   ├── pricing.pen
│   ├── about.pen
│   └── contact.pen
└── assets/
    └── images/
        ├── team/
        │   ├── alice.jpg
        │   └── bob.jpg
        └── products/
            ├── screenshot-1.png
            └── screenshot-2.png
```

## Future Considerations (Not MVP)

These are noted for future extensibility but NOT part of the initial implementation:

1. **Sync/Cloud**: Add `.pencil/sync.json` for cloud sync configuration
2. **Plugins**: Add `.pencil/plugins/` for project-specific extensions
3. **Themes**: Add `themes/` folder for custom color/font themes
4. **Templates**: Add `templates/` for reusable document templates
5. **Comments**: Add `.pencil/comments/` for design feedback threads

## Summary

This layout provides:
- ✅ Simple structure (3 core folders)
- ✅ Multiple documents per project
- ✅ Self-contained, portable projects
- ✅ Git-friendly for collaboration
- ✅ Room to grow without breaking changes
- ✅ No cloud dependencies (local-first)

The key insight is that **folders are the right primary persistence unit** — they're familiar to users, work with existing tools (Git, Dropbox, etc.), and scale naturally from single documents to complex projects.
