import type { WorkspaceTag } from "@slopcade/shared";
import type { TagPayloadResolver } from "./TagPayloadResolver";
import { createTagHotReloadHandlers } from "./tag-handlers";
import type {
	HotReloadContext,
	TagHotReloadHandler,
} from "./tag-handlers/types";

const TAG_ORDER: WorkspaceTag[] = [
	"world",
	"prefabs",
	"entities",
	"rules",
	"scripts",
	"effects",
	"assets",
];

export class HotReloadOrchestrator {
	private handlers: Map<WorkspaceTag, TagHotReloadHandler>;

	private hashes: Map<WorkspaceTag, string>;

	private payloads = new Map<WorkspaceTag, unknown>();

	constructor(
		private readonly context: HotReloadContext,
		private readonly resolver: TagPayloadResolver,
	) {
		this.handlers = createTagHotReloadHandlers(context);
		this.hashes = new Map<WorkspaceTag, string>();
	}

	async reloadTags(
		tags: WorkspaceTag[],
		newHashes: Map<WorkspaceTag, string>,
	): Promise<void> {
		const requested = new Set(tags);

		for (const tag of TAG_ORDER) {
			if (!requested.has(tag)) {
				continue;
			}

			const handler = this.handlers.get(tag);
			if (!handler) {
				continue;
			}

			const payload = this.resolver.resolve<unknown>(tag);
			if (payload === null) {
				continue;
			}

			const oldHash = this.hashes.get(tag) ?? "";
			const newHash = newHashes.get(tag) ?? oldHash;
			const oldPayload = this.payloads.get(tag) ?? payload;

			try {
				if (this.context.mode === "live") {
					await handler.fullReload(payload, this.context);
				} else if (handler.canHotSwap(oldHash, newHash, this.context)) {
					await handler.hotSwap(oldPayload, payload, this.context);
				} else {
					await handler.fullReload(payload, this.context);
				}
			} catch {
				await handler.fullReload(payload, this.context);
			}

			this.hashes.set(tag, newHash);
			this.payloads.set(tag, payload);
		}
	}

	async fullReset(tags: WorkspaceTag[]): Promise<void> {
		const requested = new Set(tags);

		for (const tag of TAG_ORDER) {
			if (!requested.has(tag)) {
				continue;
			}

			const handler = this.handlers.get(tag);
			if (!handler) {
				continue;
			}

			const payload = this.resolver.resolve<unknown>(tag);
			if (payload === null) {
				continue;
			}

			await handler.fullReload(payload, this.context);
			this.payloads.set(tag, payload);
		}
	}
}
