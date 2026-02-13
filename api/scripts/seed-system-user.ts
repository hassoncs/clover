import { execSync } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const now = Date.now();

const SLOP_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

const sql = `
-- Slop: system user that owns template/dev games (syncs to prod)
INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('${SLOP_USER_ID}', 'system@slopcade.dev', 'Slop', ${now}, ${now});

INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
VALUES ('${SLOP_USER_ID}', 999999999, 999999999, 0, ${now}, ${now});

-- Dev: auto-login user for development/testing/playing
INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('${DEV_USER_ID}', 'dev@localhost', 'Dev', ${now}, ${now});

INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
VALUES ('${DEV_USER_ID}', 999999999, 999999999, 0, ${now}, ${now});
`;

console.log("Seeding dev users...");
console.log(sql);

const tempFile = "/tmp/seed-system-user.sql";
writeFileSync(tempFile, sql);

try {
	const cwd = process.cwd().includes("/api")
		? process.cwd()
		: resolve(process.cwd(), "api");
	execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, {
		stdio: "inherit",
		cwd,
	});
	console.log("✅ Dev users seeded successfully");
	console.log(`   Slop (system):  ${SLOP_USER_ID} — owns template games`);
	console.log(`   Dev (testing):  ${DEV_USER_ID} — auto-login for dev`);
} finally {
	unlinkSync(tempFile);
}
