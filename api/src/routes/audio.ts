import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { nanoid } from "nanoid";

import { ElevenLabsService } from "@/services/ElevenLabsService";
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
			modelId,
			stability,
			similarityBoost,
			style,
			outputFormat,
		} = body;

		if (!text || typeof text !== "string") {
			return c.json({ error: "text is required" }, 400);
		}
		if (!voiceId || typeof voiceId !== "string") {
			return c.json({ error: "voiceId is required" }, 400);
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
		const r2Key = `audio/voice/${assetId}${ext}`;

		await c.env.ASSETS.put(r2Key, result.audio, {
			httpMetadata: { contentType: result.contentType },
			customMetadata: {
				type: "voice",
				text,
				voiceId,
				userId: auth.userId,
				generatedAt: new Date().toISOString(),
			},
		});

		return c.json({
			assetId,
			url: `/assets/${r2Key}`,
			contentType: result.contentType,
			durationSeconds: result.durationSeconds,
			type: "voice",
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
