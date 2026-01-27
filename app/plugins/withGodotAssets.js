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
`;
    
    const scriptName = 'Copy Godot Assets';
    const existingPhase = Object.values(xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] || {})
      .find(p => p.name === `"${scriptName}"`);
    
    if (!existingPhase) {
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
