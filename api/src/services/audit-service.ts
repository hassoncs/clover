import { nanoid } from "nanoid";

type D1Database = import("@cloudflare/workers-types").D1Database;

export type AuditAction =
	| "admin.generate_sound"
	| "admin.generate_voice"
	| "admin.generate_party_content"
	| "admin.seed_database"
	| "admin.backfill_content_hash";

export interface AuditEvent {
	id: string;
	actorId: string;
	action: AuditAction | string;
	targetType?: string;
	targetId?: string;
	metadata?: Record<string, unknown>;
	createdAt: number;
}

export interface LogEventParams {
	actorId: string;
	action: AuditAction | string;
	targetType?: string;
	targetId?: string;
	metadata?: Record<string, unknown>;
}

export class AuditService {
	constructor(private db: D1Database) {}

	async logEvent(params: LogEventParams): Promise<string> {
		const id = nanoid();
		const now = Date.now();

		try {
			await this.db
				.prepare(
					`INSERT INTO audit_events (id, actor_id, action, target_type, target_id, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					params.actorId,
					params.action,
					params.targetType ?? null,
					params.targetId ?? null,
					params.metadata ? JSON.stringify(params.metadata) : null,
					now,
				)
				.run();
		} catch (error) {
			console.error("Audit log failed (non-blocking):", error);
		}

		return id;
	}

	async getEventsByActor(
		actorId: string,
		limit = 50,
		offset = 0,
	): Promise<AuditEvent[]> {
		const results = await this.db
			.prepare(
				`SELECT * FROM audit_events WHERE actor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			)
			.bind(actorId, limit, offset)
			.all<any>();

		return (results.results ?? []).map((row) => ({
			id: row.id,
			actorId: row.actor_id,
			action: row.action,
			targetType: row.target_type ?? undefined,
			targetId: row.target_id ?? undefined,
			metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
			createdAt: row.created_at,
		}));
	}

	async getEventsByAction(
		action: string,
		limit = 50,
		offset = 0,
	): Promise<AuditEvent[]> {
		const results = await this.db
			.prepare(
				`SELECT * FROM audit_events WHERE action = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			)
			.bind(action, limit, offset)
			.all<any>();

		return (results.results ?? []).map((row) => ({
			id: row.id,
			actorId: row.actor_id,
			action: row.action,
			targetType: row.target_type ?? undefined,
			targetId: row.target_id ?? undefined,
			metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
			createdAt: row.created_at,
		}));
	}
}
