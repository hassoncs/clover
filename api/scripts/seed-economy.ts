import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const now = Date.now();

const signupCodes = [
  { code: 'BETA2026', name: 'Beta Tester Invite', maxUses: null, grantMicros: 1000000 },
  { code: 'LAUNCH100', name: 'Launch Party Invite', maxUses: 100, grantMicros: 2000000 },
  { code: 'CREATOR50', name: 'Influencer Invite', maxUses: 50, grantMicros: 5000000, notes: 'For content creators' },
];

const promoCodes = [
  { code: 'WELCOME50', name: 'Welcome Bonus', grantMicros: 500000 },
  { code: 'THANKYOU', name: 'Loyalty Reward', grantMicros: 200000, requiresPurchase: true },
];

const sql = `
-- Signup codes
INSERT OR IGNORE INTO signup_codes (code, name, max_uses, grant_amount_micros, is_active, created_at, updated_at)
VALUES 
  ('BETA2026', 'Beta Tester Invite', NULL, 1000000, 1, ${now}, ${now}),
  ('LAUNCH100', 'Launch Party Invite', 100, 2000000, 1, ${now}, ${now}),
  ('CREATOR50', 'Influencer Invite', 50, 5000000, 1, ${now}, ${now});

-- Promo codes
INSERT OR IGNORE INTO promo_codes (code, name, grant_amount_micros, is_active, requires_purchase_history, created_at, updated_at)
VALUES
  ('WELCOME50', 'Welcome Bonus', 500000, 1, 0, ${now}, ${now}),
  ('THANKYOU', 'Loyalty Reward', 200000, 1, 1, ${now}, ${now});
`;

console.log('Seeding economy data...');
console.log(sql);

const tempFile = '/tmp/seed-economy.sql';
writeFileSync(tempFile, sql);

try {
  const cwd = process.cwd().includes('/api') ? process.cwd() : resolve(process.cwd(), 'api');
  execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, { 
    stdio: 'inherit',
    cwd
  });
  console.log('✅ Economy data seeded successfully');
} finally {
  unlinkSync(tempFile);
}
