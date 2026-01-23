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
GODOT_SRC="$SRCROOT/$PRODUCT_NAME/godot"
GODOT_DST="$BUILT_PRODUCTS_DIR/$PRODUCT_NAME.app/godot"
if [ -d "$GODOT_SRC" ]; then
  mkdir -p "$GODOT_DST"
  cp -R "$GODOT_SRC/"* "$GODOT_DST/"
  echo "Copied Godot assets to $GODOT_DST"
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
