import type { CollabAwareness } from "./awareness";
import type { YjsBridge } from "./yjs-bridge";

type TransportPeerSet = Set<InMemoryP2PTransport>;

const ROOMS = new Map<string, TransportPeerSet>();

export class InMemoryP2PTransport {
	private readonly roomId: string;
	private readonly bridge: YjsBridge;
	private readonly awareness?: CollabAwareness;

	private connected = false;
	private unsubscribeBridge?: () => void;
	private unsubscribeAwareness?: () => void;

	constructor(options: {
		roomId: string;
		bridge: YjsBridge;
		awareness?: CollabAwareness;
	}) {
		this.roomId = options.roomId;
		this.bridge = options.bridge;
		this.awareness = options.awareness;
	}

	connect(): void {
		if (this.connected) return;
		this.connected = true;

		const room = getOrCreateRoom(this.roomId);
		const peers = Array.from(room).filter((peer) => peer !== this);
		room.add(this);

		this.unsubscribeBridge = this.bridge.subscribeUpdates((update, origin) => {
			if (!this.connected) return;
			if (origin === this) return;
			this.broadcastDocumentUpdate(update);
		});

		if (this.awareness) {
			this.unsubscribeAwareness = this.awareness.onUpdate(
				({ added, updated, removed, origin }) => {
					if (!this.connected) return;
					if (origin === this) return;

					const changedClientIds = [...added, ...updated, ...removed];
					if (changedClientIds.length === 0) return;
					const encoded = this.awareness?.encodeUpdate(changedClientIds);
					if (!encoded) return;
					this.broadcastAwarenessUpdate(encoded);
				},
			);
		}

		for (const peer of peers) {
			this.bridge.applyUpdate(peer.bridge.getUpdate(), this);
			peer.bridge.applyUpdate(this.bridge.getUpdate(), peer);

			if (this.awareness && peer.awareness) {
				const peerStateUpdate = peer.awareness.encodeUpdate();
				this.awareness.applyUpdate(peerStateUpdate, this);

				const localStateUpdate = this.awareness.encodeUpdate();
				peer.awareness.applyUpdate(localStateUpdate, peer);
			}
		}
	}

	disconnect(): void {
		if (!this.connected) return;

		const room = ROOMS.get(this.roomId);
		const peers = room
			? Array.from(room).filter((peer) => peer !== this)
			: ([] as InMemoryP2PTransport[]);

		if (this.awareness) {
			for (const peer of peers) {
				peer.awareness?.removeStates(
					[this.awareness.clientId],
					"peer_disconnect",
				);
			}
		}

		this.unsubscribeBridge?.();
		this.unsubscribeBridge = undefined;
		this.unsubscribeAwareness?.();
		this.unsubscribeAwareness = undefined;

		this.connected = false;

		if (room) {
			room.delete(this);
			if (room.size === 0) {
				ROOMS.delete(this.roomId);
			}
		}
	}

	destroy(): void {
		this.disconnect();
	}

	private broadcastDocumentUpdate(update: Uint8Array): void {
		const room = ROOMS.get(this.roomId);
		if (!room) return;

		for (const peer of room) {
			if (peer === this) continue;
			peer.bridge.applyUpdate(update, peer);
		}
	}

	private broadcastAwarenessUpdate(update: Uint8Array): void {
		const room = ROOMS.get(this.roomId);
		if (!room) return;

		for (const peer of room) {
			if (peer === this) continue;
			peer.awareness?.applyUpdate(update, peer);
		}
	}
}

function getOrCreateRoom(roomId: string): TransportPeerSet {
	const existing = ROOMS.get(roomId);
	if (existing) return existing;
	const created = new Set<InMemoryP2PTransport>();
	ROOMS.set(roomId, created);
	return created;
}
