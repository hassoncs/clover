const fs = require('fs');
let content = fs.readFileSync('apps/pencil/app/index.tsx', 'utf8');

content = content.replace(
    /const titleBarStyles = STYLES\[theme\]\.titleBar;/,
    'const titleBarStyles = STYLES[theme].titleBarStyles;'
);

fs.writeFileSync('apps/pencil/app/index.tsx', content);
