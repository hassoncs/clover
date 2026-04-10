const fs = require('fs');
const { execSync } = require('child_process');
try {
  execSync('rm -rf /Users/hassoncs/Workspaces/Personal/slopcade/.sisyphus/worktrees/2026-03-13-pencil-standalone-repo-extraction-refresh', { cwd: '/Users/hassoncs/Workspaces/Personal/slopcade' });
  const result = execSync('git worktree add -f /Users/hassoncs/Workspaces/Personal/slopcade/.sisyphus/worktrees/2026-03-13-pencil-standalone-repo-extraction-refresh 2026-03-13-pencil-standalone-repo-extraction-refresh', { cwd: '/Users/hassoncs/Workspaces/Personal/slopcade' });
  fs.writeFileSync('/Users/hassoncs/Workspaces/Personal/slopcade/worktree_add2.log', result);
} catch (e) {
  fs.writeFileSync('/Users/hassoncs/Workspaces/Personal/slopcade/worktree_add2.log', e.toString());
}
