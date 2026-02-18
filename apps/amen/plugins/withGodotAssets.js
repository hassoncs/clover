const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withGodotAssets(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    
    const godotSourceDir = path.join(projectRoot, 'godot');
    const pckFile = path.join(godotSourceDir, 'main.pck');
    
    if (!fs.existsSync(pckFile)) {
      console.warn('[withGodotAssets] main.pck not found at:', pckFile);
      console.warn('[withGodotAssets] Run: node scripts/export-godot.mjs --native');
      return config;
    }
    
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    
    const appDir = path.join(platformProjectRoot, projectName);
    const iosGodotDir = path.join(appDir, 'godot');
    if (!fs.existsSync(iosGodotDir)) {
      fs.mkdirSync(iosGodotDir, { recursive: true });
    }
    fs.copyFileSync(pckFile, path.join(iosGodotDir, 'main.pck'));
    console.log('[withGodotAssets] Copied main.pck to:', iosGodotDir);
    
    const targetUuid = xcodeProject.getFirstTarget().uuid;
    const buildPhases = xcodeProject.hash.project.objects['PBXNativeTarget'][targetUuid].buildPhases;
    
    const shellScript = `
# Copy Godot assets to app bundle
# Primary source: app/godot (always fresh from export script)
# Fallback: ios/Slopcade/godot (prebuild copy)
GODOT_PRIMARY="$SRCROOT/../godot"
GODOT_FALLBACK="$SRCROOT/$PRODUCT_NAME/godot"
GODOT_DST="$BUILT_PRODUCTS_DIR/$PRODUCT_NAME.app/godot"

mkdir -p "$GODOT_DST"

if [ -f "$GODOT_PRIMARY/main.pck" ]; then
  cp "$GODOT_PRIMARY/main.pck" "$GODOT_DST/"
  echo "Copied main.pck from $GODOT_PRIMARY to $GODOT_DST"
elif [ -f "$GODOT_FALLBACK/main.pck" ]; then
  cp "$GODOT_FALLBACK/main.pck" "$GODOT_DST/"
  echo "Copied main.pck from $GODOT_FALLBACK to $GODOT_DST"
else
  echo "WARNING: main.pck not found! Run: node scripts/export-godot.mjs --native"
fi

# Copy GDExtension native frameworks (e.g. Rapier2D physics)
# Godot resolves res:// relative to the main.pck directory
GODOT_PROJECT="$SRCROOT/../../godot_project"
ADDONS_DST="$GODOT_DST/addons"

for gdext_file in "$GODOT_PROJECT"/addons/*/*.gdextension; do
  [ -f "$gdext_file" ] || continue
  ADDON_DIR=$(dirname "$gdext_file")
  ADDON_NAME=$(basename "$ADDON_DIR")

  # Copy the .gdextension file itself (Godot needs it to discover the extension)
  mkdir -p "$ADDONS_DST/$ADDON_NAME"
  cp "$gdext_file" "$ADDONS_DST/$ADDON_NAME/"
  echo "Copied $(basename "$gdext_file") to $ADDONS_DST/$ADDON_NAME/"

  # Find iOS frameworks/dylibs referenced in the .gdextension file
  while IFS= read -r line; do
    case "$line" in
      ios.*.arm64*=*|ios.*.x86_64*=*)
        FW_REL=$(echo "$line" | sed 's/.*= *"\\{0,1\\}//;s/".*$//')
        FW_SRC="$ADDON_DIR/$FW_REL"
        FW_DST_DIR="$ADDONS_DST/$ADDON_NAME/$(dirname "$FW_REL")"
        if [ -d "$FW_SRC" ]; then
          mkdir -p "$FW_DST_DIR"
          cp -R "$FW_SRC" "$FW_DST_DIR/"
          echo "Copied $FW_REL to $FW_DST_DIR"
        elif [ -f "$FW_SRC" ]; then
          mkdir -p "$FW_DST_DIR"
          cp "$FW_SRC" "$FW_DST_DIR/"
          echo "Copied $FW_REL to $FW_DST_DIR"
        fi
        ;;
    esac
  done < "$gdext_file"
done

# iOS requires dylibs/frameworks in Frameworks/ (signed) for dlopen to work.
# Godot's OS_AppleEmbedded::open_dynamic_library has a fallback that checks
# Frameworks/ for the library filename. Copy iOS dylibs there so they load.
FRAMEWORKS_DST="$BUILT_PRODUCTS_DIR/$PRODUCT_NAME.app/Frameworks"
mkdir -p "$FRAMEWORKS_DST"
for dylib in "$GODOT_DST"/addons/*/bin/ios/*.dylib; do
  [ -f "$dylib" ] || continue
  DYLIB_NAME=$(basename "$dylib")
  cp "$dylib" "$FRAMEWORKS_DST/$DYLIB_NAME"
  echo "Copied $DYLIB_NAME to Frameworks/ for iOS dlopen"
done

`;
    
    const scriptName = 'Copy Godot Assets';
    const phases = xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] || {};
    const existingPhaseEntry = Object.entries(phases)
      .find(([key, p]) => !key.endsWith('_comment') && p.name === `"${scriptName}"`);
    
    if (existingPhaseEntry) {
      // Always update the script content (fixes stale build phases from previous prebuilds)
      existingPhaseEntry[1].shellScript = JSON.stringify(shellScript);
      console.log('[withGodotAssets] Updated Copy Godot Assets build phase script');
    } else {
      const scriptUuid = xcodeProject.generateUuid();
      xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] = 
        xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] || {};
      xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'][scriptUuid] = {
        isa: 'PBXShellScriptBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        inputPaths: [],
        outputPaths: [],
        runOnlyForDeploymentPostprocessing: 0,
        shellPath: '/bin/sh',
        shellScript: JSON.stringify(shellScript),
        name: `"${scriptName}"`,
      };
      xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'][`${scriptUuid}_comment`] = scriptName;
      
      buildPhases.push({ value: scriptUuid, comment: scriptName });
      console.log('[withGodotAssets] Added Copy Godot Assets build phase');
    }
    
    return config;
  });
}

module.exports = withGodotAssets;
