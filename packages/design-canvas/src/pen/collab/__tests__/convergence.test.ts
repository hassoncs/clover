import { describe, expect, it } from "vitest";
import { sceneGraphToPenDocument } from "../../runtime/adapters";
import { PenToolFacade } from "../../runtime/facade";
import { resetIdCounter, SceneGraph } from "../../runtime/scene-graph";
import { CollabAwareness } from "../awareness";
import { InMemoryP2PTransport } from "../p2p-transport";
import { YjsBridge } from "../yjs-bridge";

type PeerContext = {
	graph: SceneGraph;
	facade: PenToolFacade;
	bridge: YjsBridge;
	awareness: CollabAwareness;
	transport: InMemoryP2PTransport;
};

function createPeer(roomId: string): PeerContext {
	const graph = new SceneGraph();
	const facade = new PenToolFacade(graph);
	const bridge = new YjsBridge(graph, facade);
	const awareness = new CollabAwareness(bridge.doc);
	const transport = new InMemoryP2PTransport({
		roomId,
		bridge,
		awareness,
	});

	return { graph, facade, bridge, awareness, transport };
}

async function flushSyncBoundary(): Promise<void> {
	await Promise.resolve();
}

describe("Yjs collaboration convergence", () => {
	it("converges concurrent edits across two editors", async () => {
		resetIdCounter();

		const roomId = "convergence-room";
		const peerA = createPeer(roomId);
		const peerB = createPeer(roomId);

		peerA.transport.connect();
		peerB.transport.connect();

		peerA.facade.createNode("frame", peerA.graph.rootId, {
			id: "shared-parent",
			name: "Canvas",
		});

		await flushSyncBoundary();

		peerA.transport.disconnect();
		peerB.transport.disconnect();

		peerA.facade.createNode("rectangle", "shared-parent", {
			id: "shape-a",
			name: "A",
			x: 10,
			y: 20,
			width: 100,
			height: 80,
		});

		peerB.facade.createNode("text", "shared-parent", {
			id: "shape-b",
			name: "B",
			content: "hello",
			x: 40,
			y: 60,
		});

		peerA.transport.connect();
		peerB.transport.connect();

		await flushSyncBoundary();

		const docA = sceneGraphToPenDocument(peerA.graph);
		const docB = sceneGraphToPenDocument(peerB.graph);

		expect(docA).toEqual(docB);

		const parentA = peerA.facade.getNode("shared-parent");
		expect(parentA?.childIds.sort()).toEqual(["shape-a", "shape-b"]);

		peerA.transport.destroy();
		peerB.transport.destroy();
		peerA.awareness.destroy();
		peerB.awareness.destroy();
		peerA.bridge.destroy();
		peerB.bridge.destroy();
	});

	it("syncs baseline awareness metadata (cursor + selection)", async () => {
		const roomId = "awareness-room";
		const peerA = createPeer(roomId);
		const peerB = createPeer(roomId);

		peerA.transport.connect();
		peerB.transport.connect();

		peerA.awareness.setLocalPresence({
			userId: "user-a",
			selectedNodeId: "shared-parent",
			cursorPosition: { x: 120, y: 48 },
		});

		await flushSyncBoundary();

		const remoteStates = Array.from(
			peerB.awareness.getPresenceStates().values(),
		);
		expect(
			remoteStates.some(
				(state) =>
					state.userId === "user-a" &&
					state.selectedNodeId === "shared-parent" &&
					state.cursorPosition?.x === 120 &&
					state.cursorPosition?.y === 48,
			),
		).toBe(true);

		peerA.transport.destroy();
		peerB.transport.destroy();
		peerA.awareness.destroy();
		peerB.awareness.destroy();
		peerA.bridge.destroy();
		peerB.bridge.destroy();
	});
});
