#!/bin/bash
set -e

echo "🔧 Running eas-build-post-install.sh"
echo "📍 Current directory: $(pwd)"
echo "📂 Listing node_modules/@borndotcom:"
ls -la node_modules/@borndotcom/ 2>/dev/null || echo "Directory not found at expected path"

echo "🔍 Finding react-native-godot package..."
GODOT_PKG=$(find . -path "*/node_modules/@borndotcom/react-native-godot" -type d 2>/dev/null | head -1)
if [ -z "$GODOT_PKG" ]; then
  echo "❌ react-native-godot not found!"
  exit 1
fi

echo "📦 Found at: $GODOT_PKG"
echo "🚀 Running download-prebuilt.js..."
node "$GODOT_PKG/scripts/download-prebuilt.js"

echo "✅ download-prebuilt completed"
echo "📂 Checking ios/libs directory:"
ls -la "$GODOT_PKG/ios/libs/" 2>/dev/null || echo "ios/libs not found"
