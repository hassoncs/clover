import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { users } from "./users";

export const CONTENT_TYPES = [
	"quip",
	"trivia",
	"drawing",
	"dilemma",
	"wyr",
	"estimation",
	"fibbage",
	"caption",
	"wordgame",
	"wordlist",
	"personal",
	"FakeWord",
	"ranking",
	"headsup",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUS = ["draft", "active", "retired"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

export const CONTENT_SOURCE = ["imported", "ai", "human", "curated"] as const;
export type ContentSource = (typeof CONTENT_SOURCE)[number];

export const ASSET_TYPES = ["audio", "image"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_ROLES = ["primary", "alt", "background"] as const;
export type AssetRole = (typeof ASSET_ROLES)[number];

export const partyContent = sqliteTable(
	"party_content",
	{
		id: text("id").primaryKey(),
		brandId: text("brand_id").notNull(),
		contentType: text("content_type").notNull(),
		body: text("body").notNull(),
		category: text("category"),
		difficulty: integer("difficulty"),
		status: text("status").notNull().default("draft"),
		source: text("source").notNull().default("imported"),
		contentHash: text("content_hash"),
		metadata: text("metadata"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
		deletedAt: integer("deleted_at", { mode: "timestamp" }),
	},
	(table) => ({
		brandTypeIdx: index("idx_party_content_brand_type").on(
			table.brandId,
			table.contentType,
		),
		statusIdx: index("idx_party_content_status").on(table.status),
		categoryIdx: index("idx_party_content_category").on(table.category),
		deletedIdx: index("idx_party_content_deleted").on(table.deletedAt),
		contentHashIdx: index("idx_party_content_hash").on(table.contentHash),
	}),
);

export const partyContentAssets = sqliteTable(
	"party_content_assets",
	{
		id: text("id").primaryKey(),
		contentId: text("content_id")
			.notNull()
			.references(() => partyContent.id, { onDelete: "cascade" }),
		r2Key: text("r2_key").notNull(),
		assetType: text("asset_type").notNull(),
		role: text("role").notNull().default("primary"),
		mimeType: text("mime_type"),
		durationMs: integer("duration_ms"),
		fileSize: integer("file_size"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		deletedAt: integer("deleted_at", { mode: "timestamp" }),
	},
	(table) => ({
		contentIdx: index("idx_party_content_assets_content").on(table.contentId),
		typeIdx: index("idx_party_content_assets_type").on(table.assetType),
		deletedIdx: index("idx_party_content_assets_deleted").on(table.deletedAt),
	}),
);

export const partyContentReviews = sqliteTable(
	"party_content_reviews",
	{
		id: text("id").primaryKey(),
		contentId: text("content_id")
			.notNull()
			.references(() => partyContent.id, { onDelete: "cascade" }),
		reviewerUserId: text("reviewer_user_id")
			.notNull()
			.references(() => users.id),
		qualityScore: integer("quality_score").notNull(),
		humorScore: integer("humor_score").notNull(),
		notes: text("notes"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		contentReviewerUnique: uniqueIndex("idx_party_content_reviews_unique").on(
			table.contentId,
			table.reviewerUserId,
		),
		contentIdx: index("idx_party_content_reviews_content").on(table.contentId),
		reviewerIdx: index("idx_party_content_reviews_reviewer").on(
			table.reviewerUserId,
		),
	}),
);

export const partyContentStatusTransitions = sqliteTable(
	"party_content_status_transitions",
	{
		id: text("id").primaryKey(),
		contentId: text("content_id")
			.notNull()
			.references(() => partyContent.id, { onDelete: "cascade" }),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		actorId: text("actor_id").references(() => users.id),
		reason: text("reason"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => ({
		contentIdx: index("idx_party_content_transitions_content").on(
			table.contentId,
		),
		actorIdx: index("idx_party_content_transitions_actor").on(table.actorId),
	}),
);

export const insertPartyContentSchema = createInsertSchema(partyContent);
export const selectPartyContentSchema = createSelectSchema(partyContent);

export const insertPartyContentAssetSchema =
	createInsertSchema(partyContentAssets);
export const selectPartyContentAssetSchema =
	createSelectSchema(partyContentAssets);

export const insertPartyContentReviewSchema =
	createInsertSchema(partyContentReviews);
export const selectPartyContentReviewSchema =
	createSelectSchema(partyContentReviews);

export const partyContentSnapshots = sqliteTable(
	"party_content_snapshots",
	{
		id: text("id").primaryKey(),
		version: integer("version").notNull().unique(),
		publishedBy: text("published_by").notNull(),
		publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
		contentCount: integer("content_count").notNull(),
		contentIds: text("content_ids").notNull(),
		metadata: text("metadata"),
	},
	(table) => ({
		versionIdx: index("idx_party_content_snapshots_version").on(table.version),
		publishedAtIdx: index("idx_party_content_snapshots_published_at").on(
			table.publishedAt,
		),
	}),
);

export const insertPartyContentStatusTransitionSchema = createInsertSchema(
	partyContentStatusTransitions,
);
export const selectPartyContentStatusTransitionSchema = createSelectSchema(
	partyContentStatusTransitions,
);

export const insertPartyContentSnapshotSchema = createInsertSchema(
	partyContentSnapshots,
);
export const selectPartyContentSnapshotSchema = createSelectSchema(
	partyContentSnapshots,
);

export type PartyContent = z.infer<typeof selectPartyContentSchema>;
export type NewPartyContent = z.infer<typeof insertPartyContentSchema>;

export type PartyContentAsset = z.infer<typeof selectPartyContentAssetSchema>;
export type NewPartyContentAsset = z.infer<
	typeof insertPartyContentAssetSchema
>;

export type PartyContentReview = z.infer<typeof selectPartyContentReviewSchema>;
export type NewPartyContentReview = z.infer<
	typeof insertPartyContentReviewSchema
>;

export type PartyContentStatusTransition = z.infer<
	typeof selectPartyContentStatusTransitionSchema
>;
export type NewPartyContentStatusTransition = z.infer<
	typeof insertPartyContentStatusTransitionSchema
>;

export type PartyContentSnapshot = z.infer<
	typeof selectPartyContentSnapshotSchema
>;
export type NewPartyContentSnapshot = z.infer<
	typeof insertPartyContentSnapshotSchema
>;
