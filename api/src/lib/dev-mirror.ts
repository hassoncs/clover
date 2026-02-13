import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

let _r2Dir: string | null = null;

function getR2Dir(): string {
	if (_r2Dir) return _r2Dir;
	try {
		const dir = dirname(fileURLToPath(import.meta.url));
		_r2Dir = resolve(dir, "..", "..", "..", "r2");
	} catch {
		_r2Dir = resolve(process.cwd(), "r2");
	}
	return _r2Dir;
}

export function mirrorToLocalR2(r2Key: string, data: string | Buffer): void {
	if (!__DEV__) return;

	try {
		const filePath = join(getR2Dir(), r2Key);
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
		const filePath = join(getR2Dir(), r2Key);
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
