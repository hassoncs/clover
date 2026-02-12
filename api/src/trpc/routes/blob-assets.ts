import { z } from "zod";
import { BlobStore } from "../../services/BlobStore";
import { protectedProcedure, publicProcedure, router } from "../index";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer as ArrayBuffer;
}

export const blobAssetsRouter = router({
	upload: protectedProcedure
		.input(
			z.object({
				data: z.string(),
				mimeType: z.string(),
				meta: z
					.object({
						width: z.number().optional(),
						height: z.number().optional(),
						source: z.enum(["generated", "uploaded"]).optional(),
						compiledPrompt: z.string().optional(),
						modelId: z.string().optional(),
						themeId: z.string().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const blobStore = new BlobStore(ctx.env.ASSETS, ctx.env.DB);
			const buffer = base64ToArrayBuffer(input.data);
			const result = await blobStore.put(buffer, input.mimeType, {
				...input.meta,
				creatorUserId: ctx.user.id,
			});
			return result;
		}),

	getUrl: publicProcedure
		.input(z.object({ hash: z.string().length(64) }))
		.query(async ({ ctx, input }) => {
			const blobStore = new BlobStore(ctx.env.ASSETS, ctx.env.DB);
			return { url: blobStore.getUrl(input.hash) };
		}),

	exists: publicProcedure
		.input(z.object({ hash: z.string().length(64) }))
		.query(async ({ ctx, input }) => {
			const blobStore = new BlobStore(ctx.env.ASSETS, ctx.env.DB);
			const exists = await blobStore.exists(input.hash);
			return { exists };
		}),

	batchResolve: publicProcedure
		.input(z.object({ hashes: z.array(z.string().length(64)) }))
		.query(async ({ ctx, input }) => {
			const blobStore = new BlobStore(ctx.env.ASSETS, ctx.env.DB);
			const urls: Record<string, string> = {};
			for (const hash of input.hashes) {
				urls[hash] = blobStore.getUrl(hash);
			}
			return { urls };
		}),
});
