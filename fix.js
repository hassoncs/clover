const fs = require('fs');
let content = fs.readFileSync('apps/pencil/app/index.tsx', 'utf8');
content = content.replace(
    /isConnected,\n, theme, onToggleTheme\}: TitleBarProps\) \{/,
    'isConnected,\n\ttheme,\n\tonToggleTheme,\n}: TitleBarProps) {'
);
fs.writeFileSync('apps/pencil/app/index.tsx', content);
