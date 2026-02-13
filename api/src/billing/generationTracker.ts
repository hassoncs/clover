import { nanoid } from "nanoid";

import type { Env } from "@/trpc/context";

export type GenerationType = "sfx" | "voice" | "background";

export interface TrackGenerationParams {
	userId: string;
	type: GenerationType;
	prompt: string;
	assetId: string;
	r2Key: string;
	durationSeconds: number | null;
	costEstimate: {
		estimatedCredits: number;
		details: string;
	};
	metadata?: Record<string, unknown>;
}

export interface GenerationRecord {
	id: string;
	userId: string;
	type: GenerationType;
	prompt: string;
	assetId: string;
	r2Key: string;
	durationSeconds: number | null;
	estimatedCredits: number;
	metadataJson: string | null;
	createdAt: number;
}

export async function trackGeneration(
	db: Env["DB"],
	params: TrackGenerationParams,
): Promise<GenerationRecord> {
	const id = nanoid();
	const now = Date.now();

	const metadata = params.metadata
		? {
				...params.metadata,
				costDetails: params.costEstimate.details,
			}
		: { costDetails: params.costEstimate.details };

	const metadataJson = JSON.stringify(metadata);

	try {
		await db
			.prepare(
				`INSERT INTO generations (id, user_id, type, prompt, asset_id, r2_key, duration_seconds, estimated_credits, metadata_json, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				params.userId,
				params.type,
				params.prompt,
				params.assetId,
				params.r2Key,
				params.durationSeconds,
				params.costEstimate.estimatedCredits,
				metadataJson,
				now,
			)
			.run();
	} catch (err) {
		console.error("Failed to track generation:", err);
	}

	return {
		id,
		userId: params.userId,
		type: params.type,
		prompt: params.prompt,
		assetId: params.assetId,
		r2Key: params.r2Key,
		durationSeconds: params.durationSeconds,
		estimatedCredits: params.costEstimate.estimatedCredits,
		metadataJson,
		createdAt: now,
	};
}
