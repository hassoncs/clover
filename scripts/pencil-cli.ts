#!/usr/bin/env npx tsx
import { spawnSync } from "child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "fs";
import { basename, resolve } from "path";

function convertToV1(doc: Record<string, unknown>): Record<string, unknown> {
	// Delegate to the canonical converter script for a single source of truth.
	const tmpIn = "/tmp/pencil-cli-convert-in.json";
	const tmpOut = "/tmp/pencil-cli-convert-out.json";
	writeFileSync(tmpIn, JSON.stringify(doc));
	const result = spawnSync(
		"npx",
		["tsx", "scripts/convert-pen-to-v1.ts", tmpIn, tmpOut],
		{
			cwd: "/Users/hassoncs/Workspaces/Personal/slopcade",
			encoding: "utf-8",
		},
	);
	if (result.status !== 0) {
		console.error("Converter failed:", result.stderr);
		throw new Error("Conversion failed");
	}
	return JSON.parse(readFileSync(tmpOut, "utf-8")) as Record<string, unknown>;
}

async function launchBrowser(headless: boolean) {
	const { chromium } = await import("playwright");
	const args = headless
		? [
				"--enable-webgl",
				"--use-gl=angle",
				"--use-angle=swiftshader-webgl",
				"--enable-unsafe-swiftshader",
				"--ignore-gpu-blocklist",
			]
		: [];
	return chromium.launch({ headless, args });
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes("--help")) {
		console.log(`pencil-cli — Load .pen files into the Pencil web tool

Usage:
  npx tsx scripts/pencil-cli.ts <file.pen> [--port <number>] [--headless]

Options:
  --port <number>    Pencil app port (default: 8089)
  --no-convert       Skip v1 conversion
  --headless         Take screenshots in headless mode (SwiftShader)

Examples:
  npx tsx scripts/pencil-cli.ts pencil-comparison/liftlog-25-v1.pen --headless
`);
		process.exit(0);
	}

	const filePath = resolve(args[0]);
	let port = 8089;
	let skipConvert = false;
	let headless = false;

	for (let i = 1; i < args.length; i++) {
		if (args[i] === "--port" && args[i + 1]) {
			port = Number.parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === "--no-convert") skipConvert = true;
		else if (args[i] === "--headless") headless = true;
	}

	if (!existsSync(filePath)) {
		console.error(`Error: File not found: ${filePath}`);
		process.exit(1);
	}

	console.log(`Reading: ${basename(filePath)}`);
	const raw = readFileSync(filePath, "utf-8");
	let doc: Record<string, unknown>;
	try {
		doc = JSON.parse(raw);
	} catch {
		console.error(`Error: Invalid JSON`);
		process.exit(1);
	}

	let penDoc: Record<string, unknown>;
	if (skipConvert) {
		penDoc = doc;
		console.log("Skipping conversion");
	} else {
		console.log("Converting to v1...");
		penDoc = convertToV1(doc);
		console.log(
			`Converted: version=${penDoc.version}, children=${(penDoc.children as unknown[]).length}`,
		);
	}

	const docJson = JSON.stringify(penDoc);
	console.log(
		`Document size: ${(Buffer.byteLength(docJson) / 1024).toFixed(0)} KB`,
	);

	const screenshotDir = "pencil-comparison/pencil-app";
	mkdirSync(screenshotDir, { recursive: true });

	const browser = await launchBrowser(headless);
	const page = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});

	console.log(`Opening Pencil at http://localhost:${port}...`);
	await page.goto(`http://localhost:${port}`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});

	console.log("Injecting document...");
	await page.evaluate((json) => {
		window.localStorage.setItem("pencil:last-document", json);
	}, docJson);

	await page.reload({ waitUntil: "networkidle", timeout: 30000 });
	await page.waitForTimeout(3000);

	// Screenshot the full design system view
	await page.screenshot({ path: `${screenshotDir}/00-full.png` });
	console.log(`Saved: ${screenshotDir}/00-full.png`);

	// Get all layer names for individual screen screenshots
	const layerNames = await page.evaluate(() => {
		const rows = document.querySelectorAll("div[style*='paddingLeft']");
		return Array.from(rows)
			.map((row) => row.textContent?.trim())
			.filter(Boolean);
	});
	console.log(`Found ${layerNames.length} layer items`);

	// Click into each top-level frame to screenshot individual screens
	// First, find the top-level frame rows
	const topFrames = await page.evaluate(() => {
		const rows = document.querySelectorAll("div[style*='paddingLeft']");
		const results: Array<{ name: string; index: number }> = [];
		Array.from(rows).forEach((row, i) => {
			const style = row.getAttribute("style") || "";
			// Top-level frames have paddingLeft: 8px (depth 0)
			if (
				style.includes("paddingLeft: 8px") ||
				style.includes("padding-left: 8px")
			) {
				const name = row.textContent?.trim() || "";
				results.push({ name, index: i });
			}
		});
		return results;
	});
	console.log(`Top-level frames: ${topFrames.map((f) => f.name).join(", ")}`);

	// For each top-level frame, click it and screenshot
	for (let i = 0; i < topFrames.length; i++) {
		const frame = topFrames[i];
		const safeName = frame.name
			.replace(/[^a-zA-Z0-9_-]/g, "_")
			.substring(0, 40);
		const screenNum = String(i + 1).padStart(2, "0");

		try {
			// Click the layer row
			const rows = await page.$$("div[style*='paddingLeft']");
			if (rows[frame.index]) {
				await rows[frame.index].click();
				await page.waitForTimeout(2000);
			}

			// Scroll canvas to make the selected frame visible
			// We need to find the frame on canvas and scroll to it
			// For now, just screenshot
			await page.screenshot({
				path: `${screenshotDir}/${screenNum}-${safeName}.png`,
			});
			console.log(`Saved: ${screenshotDir}/${screenNum}-${safeName}.png`);
		} catch (e: any) {
			console.log(`Error screenshotting ${frame.name}: ${e.message}`);
		}
	}

	await browser.close();
	console.log("Done!");
}

main();
