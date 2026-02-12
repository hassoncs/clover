# Smart Auto-Detection Implementation

## Overview

Implemented smart file type detection and enhanced output routing for Crux, making it usable without manual `--mode` flags.

## Changes Made

### 1. File Type Detector (`crux/detector.py`)

Created comprehensive file type detection system:

- **Extension Mapping**: 70+ file extensions mapped to modes (text, code, structured)
- **Content Heuristics**: Fallback detection for unknown extensions
  - JSON detection: Checks for `{...}` or `[...]` patterns
  - YAML detection: Looks for `key: value` and `- item` patterns
  - Code detection: Counts code-like patterns (braces, keywords, operators)

**Supported Extensions:**
- Text: `.md`, `.txt`, `.rst`, `.adoc`, `.org`
- Code: `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.go`, `.rs`, `.java`, `.cpp`, `.c`, `.sh`, etc.
- Structured: `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv`, `.ini`, `.conf`

### 2. Enhanced Compressor (`crux/compressor.py`)

Added structured mode support and query-aware compression:

- **Structured Mode**: New compression mode for JSON/YAML/TOML
  - Protects structure tokens: `{`, `}`, `[`, `]`, `:`, `,`, `"`
  - Optimized for preserving data structure integrity

- **Query-Aware Compression**: Optional `query` parameter
  - Focuses compression on content relevant to the query
  - Uses LLMLingua's `instruction` parameter

- **Code Mode Enhancement**: Added `rank_method="longllmlingua"` for better code compression

- **Refactored Architecture**: Split into mode-specific methods
  - `_compress_text()`: Text mode compression
  - `_compress_code()`: Code mode with LongLLMLingua ranking
  - `_compress_structured()`: Structured data compression

### 3. CLI Enhancements (`crux/cli.py`)

Major CLI improvements for better UX:

**Auto-Detection:**
- `--mode` is now optional (auto-detects from file extension)
- Manual override still available: `--mode text|code|structured`

**Output Routing:**
- Single file + no output → stdout
- Single file + output → specified file
- Directory + no output → `.crux/compressed/` (mirrors structure)
- Directory + output → specified directory (mirrors structure)

**New Features:**
- `--query, -q`: Query-aware compression
- Batch processing: Compress entire directories
- Progress reporting: Shows per-file compression stats
- Auto-create output directories

**Refactored Functions:**
- `_compress_file()`: Handles single file compression
- `_compress_directory()`: Handles batch processing
- `_display_results()`: Unified results display

### 4. Global Wrapper Script

Created `~/.local/bin/crux-wrapper` for global access:

```bash
#!/usr/bin/env bash
set -euo pipefail

CRUX_DIR="/Users/hassoncs/Workspaces/Personal/slopcade/crux"
VENV_PYTHON="$CRUX_DIR/.venv/bin/python"

if [ ! -f "$VENV_PYTHON" ]; then
    echo "Error: Crux virtual environment not found at $CRUX_DIR/.venv"
    echo "Run: cd $CRUX_DIR && python3 -m venv .venv && .venv/bin/pip install -e ."
    exit 1
fi

exec "$VENV_PYTHON" -m crux.cli "$@"
```

**Usage:**
- Add `~/.local/bin` to PATH
- Run `crux-wrapper` from anywhere
- Falls back to venv if not in PATH

### 5. Package Structure Reorganization

Fixed package structure for proper editable install:

**Before:**
```
crux/
  __init__.py
  cli.py
  compressor.py
  ...
```

**After:**
```
crux/
  crux/
    __init__.py
    cli.py
    compressor.py
    detector.py
    ...
  pyproject.toml
  README.md
```

This allows proper `pip install -e .` and module imports.

## Usage Examples

### Auto-Detection

```bash
# Detects .md → text mode
crux compress AGENTS.md

# Detects .py → code mode
crux compress main.py -o main.compressed.py

# Detects .json → structured mode
crux compress config.json -o config.compressed.json
```

### Batch Processing

```bash
# Compress all files in docs/ to .crux/compressed/
crux compress ./docs/

# Compress to custom output directory
crux compress ./docs/ -o ./compressed-docs/
```

### Query-Aware Compression

```bash
# Focus on authentication-related content
crux compress AGENTS.md --query "How do I set up authentication?" -o auth-guide.md
```

### Manual Override

```bash
# Force structured mode on .txt file
crux compress data.txt --mode structured -o data.compressed.txt
```

## Testing

Verified file type detection:

```
✓ test.txt    → text
✓ test.md     → text
✓ test.py     → code
✓ test.js     → code
✓ test.ts     → code
✓ test.json   → structured
✓ test.yaml   → structured
✓ test.toml   → structured
```

## Benefits

1. **Zero Configuration**: Works out of the box without mode flags
2. **Batch Processing**: Compress entire codebases or documentation sets
3. **Query-Aware**: Focus compression on relevant content
4. **Flexible Output**: stdout, file, or directory mirroring
5. **Global Access**: Use from anywhere via wrapper script

## Next Steps

1. Test with real-world files once model downloads complete
2. Add progress bars for batch processing
3. Consider parallel processing for large directories
4. Add `--exclude` patterns for batch processing
5. Add compression statistics summary for batch mode
