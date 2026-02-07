const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withCameraFrameProcessor(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

    const sourceFile = path.join(projectRoot, 'lib/camera/native/ios/CameraFramePlugin.mm');
    const headerFile = path.join(projectRoot, 'lib/camera/native/shared/SharedFrameBuffer.h');

    if (!fs.existsSync(sourceFile)) {
      console.warn('[withCameraFrameProcessor] CameraFramePlugin.mm not found at:', sourceFile);
      return config;
    }

    const appDir = path.join(platformProjectRoot, projectName);

    fs.copyFileSync(sourceFile, path.join(appDir, 'CameraFramePlugin.mm'));
    console.log('[withCameraFrameProcessor] Copied CameraFramePlugin.mm to:', appDir);

    if (fs.existsSync(headerFile)) {
      fs.copyFileSync(headerFile, path.join(appDir, 'SharedFrameBuffer.h'));
      console.log('[withCameraFrameProcessor] Copied SharedFrameBuffer.h to:', appDir);
    }

    const targetUuid = xcodeProject.getFirstTarget().uuid;
    const mainGroupId = xcodeProject.getFirstProject().firstProject.mainGroup;
    const mainGroupChildren = xcodeProject.getPBXGroupByKey(mainGroupId).children;
    const appGroupEntry = mainGroupChildren.find((child) => child.comment === projectName);

    if (appGroupEntry) {
      const appGroupKey = appGroupEntry.value;
      xcodeProject.addSourceFile(
        'CameraFramePlugin.mm',
        { target: targetUuid },
        appGroupKey
      );
      console.log('[withCameraFrameProcessor] Added CameraFramePlugin.mm to Xcode project');
    } else {
      console.warn('[withCameraFrameProcessor] Could not find app group in Xcode project');
    }

    return config;
  });
}

module.exports = withCameraFrameProcessor;
