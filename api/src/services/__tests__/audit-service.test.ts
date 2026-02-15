import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditService } from "../audit-service";

type D1Database = import("@cloudflare/workers-types").D1Database;

interface AuditRow {
	id: string;
	actor_id: string;
	action: string;
	target_type: string | null;
	target_id: string | null;
	metadata_json: string | null;
	created_at: number;
}

function createMockDb() {
	const insertedRows: AuditRow[] = [];

	const db = {
		prepare: vi.fn().mockImplementation((sql: string) => {
			const isInsert = sql.trim().toUpperCase().startsWith("INSERT");
			const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

			return {
				bind: vi.fn().mockImplementation((...args: unknown[]) => {
					if (isInsert) {
						insertedRows.push({
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
						const action = args[0] as string;
						const matchingRows = insertedRows.filter(
							(row) => row.actor_id === action || row.action === action,
						);
						const limit = (args[1] as number) ?? 50;
						const offset = (args[2] as number) ?? 0;
						const paginated = matchingRows.slice(offset, offset + limit);
						return {
							all: vi.fn().mockResolvedValue({ results: paginated }),
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

	return { db, insertedRows };
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
			const eventId = await auditService.logEvent({
				actorId: "user-123",
				action: "admin.generate_sound",
			});

			expect(eventId).toBeTruthy();
			expect(eventId).toHaveLength(21);
			expect(dbMock.insertedRows).toHaveLength(1);

			const row = dbMock.insertedRows[0];
			expect(row.actor_id).toBe("user-123");
			expect(row.action).toBe("admin.generate_sound");
			expect(row.target_type).toBeNull();
			expect(row.target_id).toBeNull();
			expect(row.metadata_json).toBeNull();
			expect(row.created_at).toBeGreaterThan(0);
		});

		it("inserts audit event with all optional fields", async () => {
			await auditService.logEvent({
				actorId: "user-456",
				action: "admin.seed_database",
				targetType: "database",
				targetId: "production",
				metadata: { targets: ["system-users", "economy"], seeded: 2 },
			});

			expect(dbMock.insertedRows).toHaveLength(1);

			const row = dbMock.insertedRows[0];
			expect(row.actor_id).toBe("user-456");
			expect(row.action).toBe("admin.seed_database");
			expect(row.target_type).toBe("database");
			expect(row.target_id).toBe("production");
			expect(row.metadata_json).toBe(
				JSON.stringify({ targets: ["system-users", "economy"], seeded: 2 }),
			);
		});

		it("generates unique IDs for each event", async () => {
			const id1 = await auditService.logEvent({
				actorId: "user-1",
				action: "admin.action1",
			});
			const id2 = await auditService.logEvent({
				actorId: "user-2",
				action: "admin.action2",
			});

			expect(id1).not.toBe(id2);
		});

		it("serializes metadata to JSON", async () => {
			await auditService.logEvent({
				actorId: "user-789",
				action: "admin.generate_voice",
				metadata: {
					outputName: "test-audio",
					voicePreset: "announcer",
					sizeBytes: 12345,
				},
			});

			const row = dbMock.insertedRows[0];
			const parsed = JSON.parse(row.metadata_json!);
			expect(parsed.outputName).toBe("test-audio");
			expect(parsed.voicePreset).toBe("announcer");
			expect(parsed.sizeBytes).toBe(12345);
		});
	});

	describe("getEventsByActor", () => {
		it("returns events for a specific actor", async () => {
			await auditService.logEvent({
				actorId: "actor-1",
				action: "admin.action1",
			});
			await auditService.logEvent({
				actorId: "actor-2",
				action: "admin.action2",
			});
			await auditService.logEvent({
				actorId: "actor-1",
				action: "admin.action3",
			});

			const events = await auditService.getEventsByActor("actor-1");

			expect(events).toHaveLength(2);
			expect(events[0].actorId).toBe("actor-1");
		});

		it("respects limit and offset", async () => {
			for (let i = 0; i < 10; i++) {
				await auditService.logEvent({
					actorId: "actor-limit-test",
					action: `admin.action${i}`,
				});
			}

			const page1 = await auditService.getEventsByActor(
				"actor-limit-test",
				5,
				0,
			);
			const page2 = await auditService.getEventsByActor(
				"actor-limit-test",
				5,
				5,
			);

			expect(page1).toHaveLength(5);
			expect(page2).toHaveLength(5);
		});
	});

	describe("getEventsByAction", () => {
		it("returns events for a specific action type", async () => {
			await auditService.logEvent({
				actorId: "user-1",
				action: "admin.generate_sound",
			});
			await auditService.logEvent({
				actorId: "user-2",
				action: "admin.generate_voice",
			});
			await auditService.logEvent({
				actorId: "user-3",
				action: "admin.generate_sound",
			});

			const events = await auditService.getEventsByAction(
				"admin.generate_sound",
			);

			expect(events).toHaveLength(2);
			expect(events[0].action).toBe("admin.generate_sound");
		});
	});
});
