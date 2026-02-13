/**
 * Dev-only: mirrors R2 writes to the local r2/ directory on disk.
 * This keeps the git-tracked r2/ files in sync with what the app writes.
 *
 * Only active when __DEV__ is true (local Wrangler dev server).
 */
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const R2_DIR = resolve(__dirname, "..", "..", "..", "r2");

export function mirrorToLocalR2(r2Key: string, data: string | Buffer): void {
	if (!__DEV__) return;

	try {
		const filePath = join(R2_DIR, r2Key);
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(filePath, data);
	} catch (err) {
		// Non-fatal — don't break API if disk write fails
		console.warn(
			`[dev-mirror] Failed to mirror ${r2Key}:`,
			err instanceof Error ? err.message : err,
		);
	}
}

export function mirrorBlobToLocalR2(
	r2Key: string,
	data: ArrayBuffer | Uint8Array,
): void {
	if (!__DEV__) return;

	try {
		const filePath = join(R2_DIR, r2Key);
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const buffer = Buffer.from(
			data instanceof Uint8Array ? data : new Uint8Array(data),
		);
		writeFileSync(filePath, buffer);
	} catch (err) {
		console.warn(
			`[dev-mirror] Failed to mirror blob ${r2Key}:`,
			err instanceof Error ? err.message : err,
		);
	}
}
