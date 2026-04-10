#!/usr/bin/env npx tsx
import { mkdirSync, readFileSync } from "fs";
/**
 * Screenshot each frame by repositioning target frame to origin while keeping
 * the full document intact. Ref nodes need the full component tree to resolve.
 */
import { chromium } from "playwright";

async function main() {
	const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
	const doc = JSON.parse(docJson);
	const frames: any[] = doc.children || [];
	console.log(
		`${frames.length} frames: ${frames.map((f: any) => f.name).join(", ")}`,
	);

	const dir = "pencil-comparison/pencil-app";
	mkdirSync(dir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		args: [
			"--enable-webgl",
			"--use-gl=angle",
			"--use-angle=swiftshader-webgl",
			"--enable-unsafe-swiftshader",
			"--ignore-gpu-blocklist",
		],
	});

	// Full overview first
	{
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
		});
		await page.goto("http://localhost:8089", {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await page.waitForTimeout(2000);
		await page.evaluate(
			(j) => window.localStorage.setItem("pencil:last-document", j),
			docJson,
		);
		await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });

		// Wait for Skia canvas to actually mount (WithSkiaWeb loads WASM async)
		await page.waitForFunction(
			() => document.querySelectorAll("canvas").length > 0,
			{ timeout: 30000 },
		);
		// Extra wait for initial render pass
		await page.waitForTimeout(5000);

		await page.screenshot({ path: `${dir}/00-full.png` });
		console.log("Saved: 00-full.png (full overview)");
		await page.close();
	}

	// For each frame group, move it to origin and offset everything else
	for (let i = 0; i < frames.length; i++) {
		const target = frames[i];
		const safe = (target.name || target.id)
			.replace(/[^a-zA-Z0-9_-]/g, "_")
			.substring(0, 40);
		const num = String(i + 1).padStart(2, "0");

		// Clone full doc, move target frame to origin, shift all other frames
		const modified = JSON.parse(docJson);
		const targetX = target.x || 0;
		const targetY = target.y || 0;

		// Move the target frame to origin
		modified.children[i].x = 0;
		modified.children[i].y = 0;

		// Shift all other frames away from the target
		for (let j = 0; j < modified.children.length; j++) {
			if (j === i) continue;
			const f = modified.children[j];
			// Move away so they don't overlap with the target at origin
			f.x = (f.x || 0) - targetX + 5000;
			f.y = (f.y || 0) - targetY + 5000;
		}

		const modifiedJson = JSON.stringify(modified);

		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
		});
		try {
			await page.goto("http://localhost:8089", {
				waitUntil: "domcontentloaded",
				timeout: 25000,
			});
			await page.waitForTimeout(2000);
			await page.evaluate(
				(j) => window.localStorage.setItem("pencil:last-document", j),
				modifiedJson,
			);
			await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
			// Wait for Skia canvas to mount (WithSkiaWeb loads WASM async)
			await page.waitForFunction(
				() => document.querySelectorAll("canvas").length > 0,
				{ timeout: 30000 },
			);
			await page.waitForTimeout(5000);
			await page.screenshot({ path: `${dir}/${num}-${safe}.png` });
			console.log(`Saved: ${num}-${safe}.png (${target.name})`);
		} catch (e: any) {
			console.log(`Error ${target.name}: ${e.message.substring(0, 80)}`);
		}
		await page.close();
	}

	await browser.close();
	console.log("\nDone!");
}
main();
