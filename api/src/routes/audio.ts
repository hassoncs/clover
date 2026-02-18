import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
import { trackGeneration } from "@/billing/generationTracker";
import type { Env } from "@/trpc/context";

const router = new Hono<{ Bindings: Env }>();

async function authenticateRequest(c: {
	env: Env;
	req: { header(name: string): string | undefined };
}): Promise<{ userId: string } | { error: string; status: number }> {
	const authHeader = c.req.header("Authorization");
	const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

	if (!token) {
		return { error: "Authentication required", status: 401 };
	}

	if (__DEV__ && token === "dev-token") {
		return { userId: "00000000-0000-0000-0000-000000000000" };
	}

	if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
		return { error: "Auth not configured", status: 500 };
	}

	const supabase = createClient(
		c.env.SUPABASE_URL,
		c.env.SUPABASE_SERVICE_ROLE_KEY,
	);
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser(token);

	if (error || !user) {
		return { error: "Invalid or expired token", status: 401 };
	}

	return { userId: user.id };
}

function getFileExtension(contentType: string): string {
	if (contentType.includes("mpeg")) return ".mp3";
	if (contentType.includes("pcm")) return ".pcm";
	return ".bin";
}

async function voiceCacheKey(params: {
	text: string;
	voiceId: string;
	modelId: string;
	stability: number;
	similarityBoost: number;
	style: number;
}): Promise<string> {
	const input = [
		params.voiceId,
		params.text.trim().toLowerCase(),
		params.modelId,
		params.stability.toFixed(2),
		params.similarityBoost.toFixed(2),
		params.style.toFixed(2),
	].join("|");
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(input),
	);
	const hex = [...new Uint8Array(buf)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hex.slice(0, 24);
}

function createElevenLabsService(env: Env): ElevenLabsService {
	const apiKey = env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw new Error("ELEVENLABS_API_KEY not configured");
	}
	return new ElevenLabsService(apiKey);
}

router.post("/generate-sfx", async (c) => {
	const auth = await authenticateRequest(c);
	if ("error" in auth) {
		return c.text(auth.error, auth.status as 401 | 500);
	}

	try {
		const body = await c.req.json();
		const { text, durationSeconds, promptInfluence, outputFormat } = body;

		if (!text || typeof text !== "string") {
			return c.json({ error: "text is required" }, 400);
		}

		const service = createElevenLabsService(c.env);
		const result = await service.generateSFX({
			text,
			durationSeconds,
			promptInfluence,
			outputFormat,
		});

		const assetId = nanoid();
		const ext = getFileExtension(result.contentType);
		const r2Key = `audio/sfx/${assetId}${ext}`;

		await c.env.ASSETS.put(r2Key, result.audio, {
			httpMetadata: { contentType: result.contentType },
			customMetadata: {
				type: "sfx",
				prompt: text,
				userId: auth.userId,
				generatedAt: new Date().toISOString(),
				...(result.durationSeconds != null
					? { durationSeconds: String(result.durationSeconds) }
					: {}),
			},
		});

		const costEstimate = service.estimateCost("sfx", durationSeconds ?? 2);
		await trackGeneration(c.env.DB, {
			userId: auth.userId,
			type: "sfx",
			prompt: text,
			assetId,
			r2Key,
			durationSeconds: result.durationSeconds,
			costEstimate,
		});

		return c.json({
			assetId,
			url: `/assets/${r2Key}`,
			contentType: result.contentType,
			durationSeconds: result.durationSeconds,
			type: "sfx",
		});
	} catch (err) {
		console.error("SFX generation error:", err);
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

router.post("/generate-voice", async (c) => {
	const auth = await authenticateRequest(c);
	if ("error" in auth) {
		return c.text(auth.error, auth.status as 401 | 500);
	}

	try {
		const body = await c.req.json();
		const {
			text,
			voiceId,
			modelId = "eleven_multilingual_v2",
			stability = 0.5,
			similarityBoost = 0.75,
			style = 0,
			outputFormat,
		} = body;

		if (!text || typeof text !== "string") {
			return c.json({ error: "text is required" }, 400);
		}
		if (!voiceId || typeof voiceId !== "string") {
			return c.json({ error: "voiceId is required" }, 400);
		}

		const cacheHash = await voiceCacheKey({
			text,
			voiceId,
			modelId,
			stability,
			similarityBoost,
			style,
		});
		const cacheR2Prefix = `audio/voice/cached/${cacheHash}`;

		const cached = await c.env.ASSETS.list({ prefix: cacheR2Prefix, limit: 1 });
		if (cached.objects.length > 0) {
			const obj = cached.objects[0];
			const head = await c.env.ASSETS.head(obj.key);
			const meta = head?.customMetadata ?? {};
			const cachedAssetId =
				meta.assetId ??
				obj.key
					.split("/")
					.pop()
					?.replace(/\.[^.]+$/, "") ??
				cacheHash;

			return c.json({
				assetId: cachedAssetId,
				url: `/assets/${obj.key}`,
				contentType: head?.httpMetadata?.contentType ?? "audio/mpeg",
				durationSeconds: meta.durationSeconds
					? Number(meta.durationSeconds)
					: null,
				type: "voice",
				cached: true,
			});
		}

		const service = createElevenLabsService(c.env);
		const result = await service.generateVoice({
			text,
			voiceId,
			modelId,
			stability,
			similarityBoost,
			style,
			outputFormat,
		});

		const assetId = nanoid();
		const ext = getFileExtension(result.contentType);
		const r2Key = `${cacheR2Prefix}/${assetId}${ext}`;

		await c.env.ASSETS.put(r2Key, result.audio, {
			httpMetadata: { contentType: result.contentType },
			customMetadata: {
				type: "voice",
				text,
				voiceId,
				assetId,
				userId: auth.userId,
				generatedAt: new Date().toISOString(),
				...(result.durationSeconds != null
					? { durationSeconds: String(result.durationSeconds) }
					: {}),
			},
		});

		const costEstimate = service.estimateCost("voice", text.length);
		await trackGeneration(c.env.DB, {
			userId: auth.userId,
			type: "voice",
			prompt: text,
			assetId,
			r2Key,
			durationSeconds: result.durationSeconds,
			costEstimate,
			metadata: { voiceId, modelId },
		});

		return c.json({
			assetId,
			url: `/assets/${r2Key}`,
			contentType: result.contentType,
			durationSeconds: result.durationSeconds,
			type: "voice",
			cached: false,
		});
	} catch (err) {
		console.error("Voice generation error:", err);
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

router.post("/generate-background", async (c) => {
	const auth = await authenticateRequest(c);
	if ("error" in auth) {
		return c.text(auth.error, auth.status as 401 | 500);
	}

	try {
		const body = await c.req.json();
		const { text, durationSeconds, promptInfluence, outputFormat } = body;

		if (!text || typeof text !== "string") {
			return c.json({ error: "text is required" }, 400);
		}

		const service = createElevenLabsService(c.env);
		const result = await service.generateBackground({
			text,
			durationSeconds,
			promptInfluence,
			outputFormat,
		});

		const assetId = nanoid();
		const ext = getFileExtension(result.contentType);
		const r2Key = `audio/background/${assetId}${ext}`;

		await c.env.ASSETS.put(r2Key, result.audio, {
			httpMetadata: { contentType: result.contentType },
			customMetadata: {
				type: "background",
				prompt: text,
				userId: auth.userId,
				generatedAt: new Date().toISOString(),
				...(result.durationSeconds != null
					? { durationSeconds: String(result.durationSeconds) }
					: {}),
			},
		});

		const costEstimate = service.estimateCost(
			"background",
			durationSeconds ?? 5,
		);
		await trackGeneration(c.env.DB, {
			userId: auth.userId,
			type: "background",
			prompt: text,
			assetId,
			r2Key,
			durationSeconds: result.durationSeconds,
			costEstimate,
		});

		return c.json({
			assetId,
			url: `/assets/${r2Key}`,
			contentType: result.contentType,
			durationSeconds: result.durationSeconds,
			type: "background",
		});
	} catch (err) {
		console.error("Background generation error:", err);
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

router.get("/list", async (c) => {
	const auth = await authenticateRequest(c);
	if ("error" in auth) {
		return c.text(auth.error, auth.status as 401 | 500);
	}

	try {
		const typeFilter = c.req.query("type");
		if (
			typeFilter &&
			typeFilter !== "sfx" &&
			typeFilter !== "voice" &&
			typeFilter !== "background"
		) {
			return c.json(
				{ error: "Invalid type filter. Must be sfx, voice, or background" },
				400,
			);
		}

		const prefix = typeFilter ? `audio/${typeFilter}/` : "audio/";
		const listed = await c.env.ASSETS.list({ prefix });

		const assets = await Promise.all(
			listed.objects.map(async (obj) => {
				const head = await c.env.ASSETS.head(obj.key);
				const meta = head?.customMetadata ?? {};

				if (meta.userId !== auth.userId) {
					return null;
				}

				const id = obj.key
					.split("/")
					.pop()
					?.replace(/\.[^.]+$/, "");

				return {
					id: id ?? obj.key,
					url: `/assets/${obj.key}`,
					type: meta.type ?? "unknown",
					prompt: meta.prompt ?? meta.text ?? "",
					createdAt: meta.generatedAt ?? obj.uploaded.toISOString(),
				};
			}),
		);

		const filtered = assets.filter(
			(a): a is NonNullable<typeof a> => a !== null,
		);

		return c.json({ assets: filtered });
	} catch (err) {
		console.error("List audio assets error:", err);
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

router.get("/voice-presets", async (c) => {
	const auth = await authenticateRequest(c);
	if ("error" in auth) {
		return c.text(auth.error, auth.status as 401 | 500);
	}

	try {
		const service = createElevenLabsService(c.env);
		const presets = service.getVoicePresets();
		return c.json({ presets });
	} catch (err) {
		console.error("Voice presets error:", err);
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

export default router;
