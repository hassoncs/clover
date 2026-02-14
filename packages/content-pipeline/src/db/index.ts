import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

export interface ContentItemRow {
	id: string;
	gameType: string;
	text: string;
	category: string | null;
	provenanceSource: string;
	provenanceGeneratedAt: string | null;
	provenanceGeneratedBy: string | null;
	provenancePrompt: string | null;
	provenanceMetadata: string | null;
	moderationStatus: string;
	moderationNotes: string | null;
	createdAt: string;
	updatedAt: string;
	metadata: string | null;
}

export interface ContentPackRow {
	id: string;
	name: string;
	gameType: string;
	version: string;
	createdAt: string;
	metadata: string | null;
}

export interface PackItemRow {
	packId: string;
	itemId: string;
	position: number;
}

export class PipelineDB {
	private db: Database.Database;

	constructor(dbPath?: string) {
		const path = dbPath || join(homedir(), ".slopcade", "content-pipeline.db");
		const dir = join(path, "..");

		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		this.db = new Database(path);
		this.db.pragma("journal_mode = WAL");
		this.initSchema();
	}

	private initSchema() {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS content_items (
				id TEXT PRIMARY KEY,
				gameType TEXT NOT NULL,
				text TEXT NOT NULL,
				category TEXT,
				provenanceSource TEXT NOT NULL,
				provenanceGeneratedAt TEXT,
				provenanceGeneratedBy TEXT,
				provenancePrompt TEXT,
				provenanceMetadata TEXT,
				moderationStatus TEXT NOT NULL DEFAULT 'pending',
				moderationNotes TEXT,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				metadata TEXT
			);

			CREATE INDEX IF NOT EXISTS idx_content_items_gameType ON content_items(gameType);
			CREATE INDEX IF NOT EXISTS idx_content_items_moderationStatus ON content_items(moderationStatus);
			CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);

			CREATE TABLE IF NOT EXISTS content_packs (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				gameType TEXT NOT NULL,
				version TEXT NOT NULL,
				createdAt TEXT NOT NULL,
				metadata TEXT
			);

			CREATE INDEX IF NOT EXISTS idx_content_packs_gameType ON content_packs(gameType);

			CREATE TABLE IF NOT EXISTS pack_items (
				packId TEXT NOT NULL,
				itemId TEXT NOT NULL,
				position INTEGER NOT NULL,
				PRIMARY KEY (packId, itemId),
				FOREIGN KEY (packId) REFERENCES content_packs(id) ON DELETE CASCADE,
				FOREIGN KEY (itemId) REFERENCES content_items(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_pack_items_packId ON pack_items(packId);
		`);
	}

	insertContentItem(item: ContentItemRow): void {
		const stmt = this.db.prepare(`
			INSERT INTO content_items (
				id, gameType, text, category,
				provenanceSource, provenanceGeneratedAt, provenanceGeneratedBy,
				provenancePrompt, provenanceMetadata,
				moderationStatus, moderationNotes,
				createdAt, updatedAt, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			item.id,
			item.gameType,
			item.text,
			item.category,
			item.provenanceSource,
			item.provenanceGeneratedAt,
			item.provenanceGeneratedBy,
			item.provenancePrompt,
			item.provenanceMetadata,
			item.moderationStatus,
			item.moderationNotes,
			item.createdAt,
			item.updatedAt,
			item.metadata,
		);
	}

	getContentItems(filters?: {
		gameType?: string;
		moderationStatus?: string;
		category?: string;
	}): ContentItemRow[] {
		let query = "SELECT * FROM content_items WHERE 1=1";
		const params: unknown[] = [];

		if (filters?.gameType) {
			query += " AND gameType = ?";
			params.push(filters.gameType);
		}
		if (filters?.moderationStatus) {
			query += " AND moderationStatus = ?";
			params.push(filters.moderationStatus);
		}
		if (filters?.category) {
			query += " AND category = ?";
			params.push(filters.category);
		}

		return this.db.prepare(query).all(...params) as ContentItemRow[];
	}

	updateModerationStatus(id: string, status: string, notes?: string): void {
		const stmt = this.db.prepare(`
			UPDATE content_items
			SET moderationStatus = ?, moderationNotes = ?, updatedAt = ?
			WHERE id = ?
		`);

		stmt.run(status, notes || null, new Date().toISOString(), id);
	}

	insertContentPack(pack: ContentPackRow): void {
		const stmt = this.db.prepare(`
			INSERT INTO content_packs (id, name, gameType, version, createdAt, metadata)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			pack.id,
			pack.name,
			pack.gameType,
			pack.version,
			pack.createdAt,
			pack.metadata,
		);
	}

	addItemToPack(packId: string, itemId: string, position: number): void {
		const stmt = this.db.prepare(`
			INSERT INTO pack_items (packId, itemId, position)
			VALUES (?, ?, ?)
		`);

		stmt.run(packId, itemId, position);
	}

	getPackItems(packId: string): ContentItemRow[] {
		return this.db
			.prepare(
				`
			SELECT ci.* FROM content_items ci
			JOIN pack_items pi ON ci.id = pi.itemId
			WHERE pi.packId = ?
			ORDER BY pi.position
		`,
			)
			.all(packId) as ContentItemRow[];
	}

	close(): void {
		this.db.close();
	}
}
