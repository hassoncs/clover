const fs = require('fs');
const { execSync } = require('child_process');
try {
  const result = execSync('git worktree add -b 2026-03-13-pencil-standalone-repo-extraction-refresh /Users/hassoncs/Workspaces/Personal/slopcade/.sisyphus/worktrees/2026-03-13-pencil-standalone-repo-extraction-refresh main', { cwd: '/Users/hassoncs/Workspaces/Personal/slopcade' });
  fs.writeFileSync('/Users/hassoncs/Workspaces/Personal/slopcade/worktree_add3.log', result);
} catch (e) {
  fs.writeFileSync('/Users/hassoncs/Workspaces/Personal/slopcade/worktree_add3.log', e.toString());
}
