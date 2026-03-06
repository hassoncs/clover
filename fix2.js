const fs = require('fs');
let content = fs.readFileSync('apps/pencil/app/index.tsx', 'utf8');

// Fix ThemeColors type
content = content.replace(
    /type ThemeColors = typeof THEMES\.dark;/,
    'type ThemeColors = Record<keyof typeof THEMES.dark, string>;'
);

// Fix STYLES keys
content = content.replace(/shared: getSharedStyles/g, 'sharedStyles: getSharedStyles');
content = content.replace(/titleBar: getTitleBarStyles/g, 'titleBarStyles: getTitleBarStyles');
content = content.replace(/toolSidebar: getToolSidebarStyles/g, 'toolSidebarStyles: getToolSidebarStyles');
content = content.replace(/layersPanel: getLayersPanelStyles/g, 'layersPanelStyles: getLayersPanelStyles');
content = content.replace(/chatSidebar: getChatSidebarStyles/g, 'chatSidebarStyles: getChatSidebarStyles');
content = content.replace(/chatCollapsedStrip: getChatCollapsedStripStyles/g, 'chatCollapsedStripStyles: getChatCollapsedStripStyles');

fs.writeFileSync('apps/pencil/app/index.tsx', content);
