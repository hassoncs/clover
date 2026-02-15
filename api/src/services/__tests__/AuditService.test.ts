import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditService } from "../audit-service";

type D1Database = import("@cloudflare/workers-types").D1Database;

interface StoredEvent {
	id: string;
	actor_id: string;
	action: string;
	target_type: string | null;
	target_id: string | null;
	metadata_json: string | null;
	created_at: number;
}

function createMockDb() {
	const events: StoredEvent[] = [];

	const db = {
		prepare: vi.fn().mockImplementation((sql: string) => {
			const isInsert = sql.trim().toUpperCase().startsWith("INSERT");
			const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

			return {
				bind: vi.fn().mockImplementation((...args: unknown[]) => {
					if (isInsert) {
						events.push({
							id: args[0] as string,
							actor_id: args[1] as string,
							action: args[2] as string,
							target_type: args[3] as string | null,
							target_id: args[4] as string | null,
							metadata_json: args[5] as string | null,
							created_at: args[6] as number,
						});
						return {
							run: vi.fn().mockResolvedValue({ success: true }),
						};
					}

					if (isSelect) {
						const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
						const filterField = whereMatch?.[1];
						const filterValue = args[0];

						let filtered = events;
						if (filterField === "actor_id") {
							filtered = events.filter((e) => e.actor_id === filterValue);
						} else if (filterField === "action") {
							filtered = events.filter((e) => e.action === filterValue);
						}

						return {
							all: vi.fn().mockResolvedValue({
								results: filtered.map((e) => ({
									id: e.id,
									actor_id: e.actor_id,
									action: e.action,
									target_type: e.target_type,
									target_id: e.target_id,
									metadata_json: e.metadata_json,
									created_at: e.created_at,
								})),
							}),
						};
					}

					return {
						run: vi.fn().mockResolvedValue({ success: true }),
						all: vi.fn().mockResolvedValue({ results: [] }),
					};
				}),
			};
		}),
	} as unknown as D1Database;

	return { db, events };
}

describe("AuditService", () => {
	let dbMock: ReturnType<typeof createMockDb>;
	let auditService: AuditService;

	beforeEach(() => {
		dbMock = createMockDb();
		auditService = new AuditService(dbMock.db);
	});

	describe("logEvent", () => {
		it("inserts audit event with required fields", async () => {
			const id = await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});

			expect(id).toBeTruthy();
			expect(dbMock.events).toHaveLength(1);
			expect(dbMock.events[0].actor_id).toBe("user-123");
			expect(dbMock.events[0].action).toBe("admin.generate_sound");
		});

		it("inserts audit event with optional target fields", async () => {
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.seed_database",
				targetType: "game",
				targetId: "game-456",
			});

			expect(dbMock.events[0].target_type).toBe("game");
			expect(dbMock.events[0].target_id).toBe("game-456");
		});

		it("inserts audit event with metadata", async () => {
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
				metadata: { outputName: "test.mp3", sizeBytes: 1024 },
			});

			expect(dbMock.events[0].metadata_json).toBe(
				JSON.stringify({ outputName: "test.mp3", sizeBytes: 1024 }),
			);
		});

		it("handles null metadata gracefully", async () => {
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});

			expect(dbMock.events[0].metadata_json).toBeNull();
		});

		it("returns event id even when insert fails (non-blocking)", async () => {
			const failingDb = {
				prepare: vi.fn().mockReturnValue({
					bind: vi.fn().mockReturnValue({
						run: vi.fn().mockRejectedValue(new Error("DB error")),
					}),
				}),
			} as unknown as D1Database;

			const failingService = new AuditService(failingDb);
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const id = await failingService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});

			expect(id).toBeTruthy();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Audit log failed (non-blocking):",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("getEventsByActor", () => {
		it("returns events for a specific actor", async () => {
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});
			await auditService.logEvent({
				actorId: "user-456",
				action: "admin.generate_voice",
			});
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.seed_database",
			});

			const events = await auditService.getEventsByActor("user-123");

			expect(events).toHaveLength(2);
			expect(events.every((e) => e.actorId === "user-123")).toBe(true);
		});

		it("returns empty array for unknown actor", async () => {
			const events = await auditService.getEventsByActor("unknown-user");
			expect(events).toHaveLength(0);
		});
	});

	describe("getEventsByAction", () => {
		it("returns events for a specific action type", async () => {
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});
			await auditService.logEvent({
				actorId: "user-456",
				action: "admin.generate_sound",
			});
			await auditService.logEvent({
				actorId: "user-123",
				action: "admin.seed_database",
			});

			const events = await auditService.getEventsByAction(
				"admin.generate_sound",
			);

			expect(events).toHaveLength(2);
			expect(events.every((e) => e.action === "admin.generate_sound")).toBe(
				true,
			);
		});
	});
});
