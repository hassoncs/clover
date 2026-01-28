import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const now = Date.now();

const systemUserId = '00000000-0000-0000-0000-000000000000';
const systemUserEmail = 'system@slopcade.dev';
const systemUserDisplayName = 'Slop';

const sql = `
-- System user for template games
INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('${systemUserId}', '${systemUserEmail}', '${systemUserDisplayName}', ${now}, ${now});
`;

console.log('Seeding system user...');
console.log(sql);

const tempFile = '/tmp/seed-system-user.sql';
writeFileSync(tempFile, sql);

try {
  const cwd = process.cwd().includes('/api') ? process.cwd() : resolve(process.cwd(), 'api');
  execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, { 
    stdio: 'inherit',
    cwd
  });
  console.log('✅ System user seeded successfully');
  console.log(`   User ID: ${systemUserId}`);
  console.log(`   Email: ${systemUserEmail}`);
  console.log(`   Display Name: ${systemUserDisplayName}`);
} finally {
  unlinkSync(tempFile);
}
