#!/usr/bin/env tsx
/**
 * Load a .pen file into our Pencil app at http://localhost:8089.
 *
 * Usage: tsx scripts/pencil-open.ts <file.pen>
 *
 * Uses Playwright to inject the document via localStorage (the same
 * key the app uses for auto-save), then reloads to render it.
 */

import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

const PENCIL_URL = "http://localhost:8089";
const LOCAL_DOC_KEY = "pencil:last-document";
const DOC_META_KEY = "pencil:last-document-meta";

async function main() {
	const fileArg = process.argv[2];
	if (!fileArg) {
		console.error("Usage: tsx scripts/pencil-open.ts <file.pen>");
		process.exit(1);
	}

	const filePath = path.resolve(fileArg);
	const raw = fs.readFileSync(filePath, "utf-8");
	const doc = JSON.parse(raw);

	console.log(`Loading ${filePath} into Pencil (${PENCIL_URL})...`);

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();

	await page.goto(PENCIL_URL, { waitUntil: "networkidle", timeout: 30000 });

	// Inject document via localStorage
	await page.evaluate(
		({ docKey, metaKey, docJson }) => {
			localStorage.setItem(docKey, docJson);
			localStorage.setItem(
				metaKey,
				JSON.stringify({
					name: new URL(window.location.href).pathname,
					checksum: "",
					savedAt: Date.now(),
				}),
			);
		},
		{
			docKey: LOCAL_DOC_KEY,
			metaKey: DOC_META_KEY,
			docJson: JSON.stringify(doc),
		},
	);

	// Reload to render
	await page.reload({ waitUntil: "networkidle", timeout: 30000 });

	// Wait for canvas to render
	await page.waitForTimeout(2000);

	const url = page.url();
	console.log(`Loaded. Canvas at: ${url}`);

	// Get document state (top-level frames = screens)
	const state = await page.evaluate(() => {
		const store = (window as any).__PENCIL_STORE__;
		if (store) {
			const doc = store.document;
			if (doc && doc.children) {
				return doc.children.map((c: any) => ({
					id: c.id,
					name: c.name,
					x: c.x,
					y: c.y,
					width: c.width,
					height: c.height,
				}));
			}
		}
		// Fallback: read from localStorage
		const raw = localStorage.getItem("pencil:last-document");
		if (raw) {
			const parsed = JSON.parse(raw);
			return parsed.children?.map((c: any) => ({
				id: c.id,
				name: c.name,
				x: c.x,
				y: c.y,
				width: c.width,
				height: c.height,
			}));
		}
		return [];
	});

	console.log(`Found ${state?.length || 0} top-level screens:`);
	for (const s of state || []) {
		console.log(
			`  ${s.id} (${s.name}) — ${s.width}x${s.height} at (${s.x}, ${s.y})`,
		);
	}

	await browser.close();
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
