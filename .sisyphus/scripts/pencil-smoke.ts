/**
 * Pencil Parity Smoke Script
 *
 * Deterministic end-to-end smoke test for the Pencil tool.
 * Exercises: new_document → create_node → update_node → get_document → save_document
 *
 * Run with: npx tsx .sisyphus/scripts/pencil-smoke.ts
 * Or via MCP: use game-inspector MCP tools directly
 */

import {
	PenToolFacade,
	SceneGraph,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
import {
	pencil_create_node,
	pencil_delete_node,
	pencil_get_children,
	pencil_get_node,
	pencil_update_node,
} from "../../packages/game-inspector-mcp/src/tools/pencil-v2.js";
import {
	pencil_load_document,
	pencil_new_document,
	pencil_save_document,
} from "../../packages/game-inspector-mcp/src/tools/pencil-v2-lifecycle.js";
import {
	pencil_get_document,
	pencil_get_selection,
} from "../../packages/game-inspector-mcp/src/tools/pencil-v2-query.js";

// ─── Setup ────────────────────────────────────────────────────────────────────

const graph = new SceneGraph();
const facade = new PenToolFacade(graph);

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
	if (condition) {
		console.log(`  ✓ ${label}`);
		passed++;
	} else {
		console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
		failed++;
	}
}

function assertOk<T>(
	label: string,
	result: { success: boolean; data?: T; error?: string },
): T | null {
	if (result.success && result.data !== undefined) {
		console.log(`  ✓ ${label}`);
		passed++;
		return result.data;
	} else {
		console.error(`  ✗ ${label}: ${result.error ?? "no data"}`);
		failed++;
		return null;
	}
}

// ─── Step 1: New Document ─────────────────────────────────────────────────────

console.log("\n[Step 1] New Document");
const newResult = pencil_new_document(facade, {});
assertOk("pencil_new_document succeeds", newResult);
assert(
	"document is empty",
	newResult.success &&
		(newResult as { data: { nodeCount: number } }).data.nodeCount === 0,
);

// ─── Step 2: Create Nodes ─────────────────────────────────────────────────────

console.log("\n[Step 2] Create Nodes");
const createFrame = pencil_create_node(facade, {
	type: "frame",
	parentId: "__root__",
	props: { x: 100, y: 100, width: 400, height: 300, name: "Main Frame" },
});
const frameData = assertOk("pencil_create_node (frame)", createFrame);
const frameId = frameData?.node.id;

const createRect = pencil_create_node(facade, {
	type: "rectangle",
	parentId: frameId,
	props: { x: 20, y: 20, width: 100, height: 80, fill: "#3b82f6" },
});
const rectData = assertOk(
	"pencil_create_node (rectangle inside frame)",
	createRect,
);
const rectId = rectData?.node.id;

const createText = pencil_create_node(facade, {
	type: "text",
	parentId: frameId,
	props: { x: 20, y: 120, content: "Hello Pencil", fontSize: 16 },
});
const textData = assertOk("pencil_create_node (text inside frame)", createText);
const textId = textData?.node.id;

// ─── Step 3: Get Document ─────────────────────────────────────────────────────

console.log("\n[Step 3] Get Document");
const docResult = pencil_get_document(facade, {});
const docData = assertOk("pencil_get_document succeeds", docResult);
assert("document has nodes", (docData?.document.children.length ?? 0) > 0);

// ─── Step 4: Selection ────────────────────────────────────────────────────────

console.log("\n[Step 4] Selection");
const selResult = pencil_get_selection(facade, {
	selectedIds: [frameId ?? ""],
});
const selData = assertOk("pencil_get_selection succeeds", selResult);
assert(
	"selection contains frame",
	selData?.selectedIds.includes(frameId ?? "") ?? false,
);

// ─── Step 5: Inspector Edit ───────────────────────────────────────────────────

console.log("\n[Step 5] Inspector Edit");
const updateResult = pencil_update_node(facade, {
	id: rectId ?? "",
	patch: { fill: "#ef4444", width: 150, height: 100 },
});
assertOk("pencil_update_node (fill + size)", updateResult);

const getNodeResult = pencil_get_node(facade, { id: rectId ?? "" });
const nodeData = assertOk("pencil_get_node after update", getNodeResult);
// pencil_get_node returns RuntimeNode directly
assert("fill updated to #ef4444", (nodeData as unknown as { fill?: unknown })?.fill === "#ef4444");
assert("width updated to 150", (nodeData as unknown as { width?: unknown })?.width === 150);

// ─── Step 6: Get Children ─────────────────────────────────────────────────────

console.log("\n[Step 6] Get Children");
const childrenResult = pencil_get_children(facade, { id: frameId ?? "" });
const childrenData = assertOk("pencil_get_children of frame", childrenResult);
// pencil_get_children returns RuntimeNode[] directly
assert(
	"frame has 2 children (rect + text)",
	Array.isArray(childrenData) && childrenData.length === 2,
);

// ─── Step 7: Save Document ────────────────────────────────────────────────────

console.log("\n[Step 7] Save Document");
const saveResult = pencil_save_document(facade, { pretty: false });
const saveData = assertOk("pencil_save_document succeeds", saveResult);
assert("saved JSON is non-empty", (saveData?.json.length ?? 0) > 10);
assert("saved nodeCount > 0", (saveData?.nodeCount ?? 0) > 0);

// ─── Step 8: Load Document (roundtrip) ───────────────────────────────────────

console.log("\n[Step 8] Load Document (roundtrip)");
const freshGraph = new SceneGraph();
const freshFacade = new PenToolFacade(freshGraph);
const loadResult = pencil_load_document(freshFacade, {
	json: saveData?.json ?? "{}",
});
assertOk("pencil_load_document succeeds", loadResult);

const reloadDocResult = pencil_get_document(freshFacade, {});
const reloadData = assertOk(
	"pencil_get_document after reload",
	reloadDocResult,
);
assert("reloaded document has nodes", (reloadData?.document.children.length ?? 0) > 0);

// ─── Step 9: Delete Node ──────────────────────────────────────────────────────

console.log("\n[Step 9] Delete Node");
const deleteResult = pencil_delete_node(facade, { id: textId ?? "" });
assertOk("pencil_delete_node (text)", deleteResult);

const childrenAfterDelete = pencil_get_children(facade, { id: frameId ?? "" });
const childrenAfterData = assertOk(
	"pencil_get_children after delete",
	childrenAfterDelete,
);
assert(
	"frame has 1 child after delete",
	Array.isArray(childrenAfterData) && childrenAfterData.length === 1,
);

// ─── Step 10: New Document (cleanup) ─────────────────────────────────────────

console.log("\n[Step 10] New Document (cleanup)");
const cleanResult = pencil_new_document(facade, {});
assertOk("pencil_new_document (cleanup)", cleanResult);
assert(
	"document is empty after cleanup",
	cleanResult.success &&
		(cleanResult as { data: { nodeCount: number } }).data.nodeCount === 0,
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Smoke test complete: ${passed} passed, ${failed} failed`);
if (failed > 0) {
	console.error(`\n❌ SMOKE TEST FAILED (${failed} failures)`);
	process.exit(1);
} else {
	console.log(`\n✅ SMOKE TEST PASSED (${passed} assertions)`);
	process.exit(0);
}
