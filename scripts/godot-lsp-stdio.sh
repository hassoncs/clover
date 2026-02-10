#!/usr/bin/env bash
set -euo pipefail

# Godot LSP stdio bridge for OpenCode
# This script bridges OpenCode's stdio LSP expectations to Godot's TCP LSP

PORT="${GODOT_LSP_PORT:-6008}"
GODOT_PROJECT="${GODOT_PROJECT_PATH:-$(dirname "$(dirname "$(realpath "$0")")")/godot_project}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[godot-lsp]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[godot-lsp]${NC} $1" >&2
}

error() {
    echo -e "${RED}[godot-lsp]${NC} $1" >&2
}

# Check if Godot LSP is already listening on the port
check_lsp_running() {
    nc -z 127.0.0.1 "$PORT" 2>/dev/null
}

# Start Godot LSP in headless mode
start_godot_lsp() {
    log "Starting Godot LSP on port $PORT..."
    
    # Verify godot is available
    if ! command -v godot &> /dev/null; then
        error "Godot not found in PATH. Please install Godot 4.x"
        exit 1
    fi
    
    # Verify project exists
    if [[ ! -d "$GODOT_PROJECT" ]]; then
        error "Godot project not found at: $GODOT_PROJECT"
        error "Set GODOT_PROJECT_PATH to override"
        exit 1
    fi
    
    # Start Godot LSP in background from project directory (required for LSP initialization)
    (cd "$GODOT_PROJECT" && godot --headless --editor --lsp-port "$PORT" >/tmp/godot-lsp.log 2>&1) &
    GODOT_PID=$!
    
    # Wait for LSP to be ready (Godot editor initialization can take 10-30s)
    local attempts=0
    local max_attempts=200

    while ! check_lsp_running; do
        attempts=$((attempts + 1))
        if [[ $attempts -ge $max_attempts ]]; then
            error "Godot LSP failed to start after ${max_attempts} attempts (~20s)"
            error "Check /tmp/godot-lsp.log for details"
            kill $GODOT_PID 2>/dev/null || true
            exit 1
        fi
        sleep 0.1
    done
    
    log "Godot LSP started (PID: $GODOT_PID)"
    
    # Set up cleanup on exit
    cleanup() {
        if kill -0 $GODOT_PID 2>/dev/null; then
            log "Stopping Godot LSP (PID: $GODOT_PID)"
            kill $GODOT_PID 2>/dev/null || true
            wait $GODOT_PID 2>/dev/null || true
        fi
    }
    trap cleanup EXIT INT TERM
}

main() {
    # Check if LSP is already running (e.g., from another editor instance)
    if check_lsp_running; then
        log "Connecting to existing Godot LSP on port $PORT"
    else
        start_godot_lsp
    fi
    
    # Bridge stdio to TCP
    # This is the critical piece: OpenCode sends JSON-RPC over stdin
    # and expects responses on stdout. We bridge that to Godot's TCP LSP.
    log "Bridging stdio <-> TCP (127.0.0.1:$PORT)"
    exec nc 127.0.0.1 "$PORT"
}

main "$@"
