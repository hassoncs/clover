import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	findPencilAppImportBoundaryViolations,
	type ImportBoundaryViolation,
} from "../check-pencil-app-import-boundary";

function createFixture(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), "pencil-import-boundary-"));

	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = join(root, relativePath);
		mkdirSync(join(filePath, ".."), { recursive: true });
		writeFileSync(filePath, content);
	}

	return root;
}

function sortedViolations(violations: ImportBoundaryViolation[]) {
	return violations.map((violation) => ({
		filePath: violation.filePath,
		moduleSpecifier: violation.moduleSpecifier,
		line: violation.line,
	}));
}

describe("check-pencil-app-import-boundary", () => {
	it("flags forbidden imports inside apps/pencil/app", () => {
		const root = createFixture({
			"apps/pencil/app/index.tsx":
				'import { Canvas } from "@shopify/react-native-skia";\n',
			"apps/pencil/app/other.tsx":
				'import { PenCanvasPanel } from "@pencil/design-canvas";\n',
		});

		expect(
			sortedViolations(findPencilAppImportBoundaryViolations(root)),
		).toEqual([
			{
				filePath: "apps/pencil/app/index.tsx",
				moduleSpecifier: "@shopify/react-native-skia",
				line: 1,
			},
			{
				filePath: "apps/pencil/app/other.tsx",
				moduleSpecifier: "@pencil/design-canvas",
				line: 1,
			},
		]);
	});

	it("allows route files that only lazy import safe local components", () => {
		const root = createFixture({
			"apps/pencil/app/index.tsx":
				'const Panel = lazy(() => import("../components/PencilCanvasPanel.web"));\n',
			"apps/pencil/components/PencilCanvasPanel.web.tsx":
				'const { WithSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");\n',
		});

		expect(findPencilAppImportBoundaryViolations(root)).toEqual([]);
	});

	it("ignores tests outside the route tree", () => {
		const root = createFixture({
			"apps/pencil/components/PencilCanvasPanelInner.test.tsx":
				'import { PenCanvasPanel } from "@pencil/design-canvas";\n',
		});

		expect(findPencilAppImportBoundaryViolations(root)).toEqual([]);
	});
});
