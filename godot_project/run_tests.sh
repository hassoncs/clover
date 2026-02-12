#!/usr/bin/env bash
set -euo pipefail

# Get the directory of this script (godot_project/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

# Check if godot is in path
if ! command -v godot &> /dev/null; then
    if [ -n "${GODOT_BIN:-}" ]; then
        echo "Using GODOT_BIN environment variable: $GODOT_BIN"
    # Try finding it in /Applications on macOS
    elif [ -d "/Applications/Godot.app" ]; then
        GODOT_BIN="/Applications/Godot.app/Contents/MacOS/Godot"
        echo "Found Godot in /Applications, using: $GODOT_BIN"
    else
        echo "Please install Godot or set GODOT_BIN environment variable."
        exit 1
    fi
else
    GODOT_BIN="godot"
fi

echo "Running tests in $ROOT_DIR with $GODOT_BIN..."

# gdUnit4 command line tool requires -s (script) and -a (test path relative to project root)
"$GODOT_BIN" --headless --path "$ROOT_DIR" \
  -s "res://addons/gdUnit4/bin/GdUnitCmdTool.gd" \
  --audio-driver Dummy \
  --display-driver headless \
  --ignoreHeadlessMode \
  -a "res://tests"
