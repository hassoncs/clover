#!/bin/bash

# Godot Spike Helper Script
# Usage: ./scripts/godot-spike.sh [command]

set -e

GODOT_PROJECT="godot_project"
EXPORT_DIR="$GODOT_PROJECT/export/web"

# Detect Godot binary
detect_godot() {
    if command -v godot &> /dev/null; then
        echo "godot"
    elif command -v godot4 &> /dev/null; then
        echo "godot4"
    elif [ -f "/Applications/Godot.app/Contents/MacOS/Godot" ]; then
        echo "/Applications/Godot.app/Contents/MacOS/Godot"
    else
        echo ""
    fi
}

GODOT=$(detect_godot)

case "$1" in
    "run"|"")
        if [ -z "$GODOT" ]; then
            echo "Error: Godot not found. Please install Godot 4.3+"
            echo "  brew install godot"
            echo "  or download from https://godotengine.org/download"
            exit 1
        fi
        echo "Running Godot project..."
        $GODOT --path "$GODOT_PROJECT"
        ;;
    
    "editor")
        if [ -z "$GODOT" ]; then
            echo "Error: Godot not found."
            exit 1
        fi
        echo "Opening Godot Editor..."
        $GODOT --path "$GODOT_PROJECT" --editor
        ;;
    
    "export")
        if [ -z "$GODOT" ]; then
            echo "Error: Godot not found."
            exit 1
        fi
        echo "Exporting to web..."
        mkdir -p "$EXPORT_DIR"
        $GODOT --headless --path "$GODOT_PROJECT" --export-release "Web" "export/web/index.html"
        echo "Exported to $EXPORT_DIR"
        ;;
    
    "serve")
        echo "Starting web server..."
        if [ ! -d "$EXPORT_DIR" ]; then
            echo "Error: Export directory not found. Run './scripts/godot-spike.sh export' first."
            exit 1
        fi
        cd "$EXPORT_DIR"
        echo "Open http://localhost:8080 in your browser"
        python3 -m http.server 8080
        ;;
    
    "export-serve")
        $0 export
        $0 serve
        ;;
    
    "check")
        echo "Checking Godot installation..."
        if [ -z "$GODOT" ]; then
            echo "Error: Godot not found."
            exit 1
        fi
        echo "Godot found: $GODOT"
        $GODOT --version
        echo ""
        echo "Checking export templates..."
        TEMPLATES_DIR="$HOME/Library/Application Support/Godot/export_templates"
        if [ -d "$TEMPLATES_DIR" ]; then
            echo "Export templates found:"
            ls "$TEMPLATES_DIR"
        else
            echo "Warning: Export templates not found."
            echo "Install via: Editor > Manage Export Templates"
        fi
        ;;
    
    "help"|"--help"|"-h")
        echo "Godot Spike Helper Script"
        echo ""
        echo "Usage: ./scripts/godot-spike.sh [command]"
        echo ""
        echo "Commands:"
        echo "  run          Run the game in Godot (default)"
        echo "  editor       Open Godot Editor"
        echo "  export       Export to web (HTML5)"
        echo "  serve        Start local web server for exported game"
        echo "  export-serve Export and serve in one step"
        echo "  check        Check Godot installation"
        echo "  help         Show this help"
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Run './scripts/godot-spike.sh help' for usage."
        exit 1
        ;;
esac
