import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { publicProcedure, router } from "@/trpc/index";
import {
	createScenarioClient,
	ScenarioImageClient,
} from "@/ai/providers/scenario";

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the drawing engine inside Pencil, an AI-powered infinite design canvas. You draw directly on the canvas by returning JSON ops.

YOU MUST RESPOND WITH VALID JSON ONLY. No markdown, no prose, no code blocks — raw JSON only.

Response format:
{"reply":"short 1-2 sentence confirmation","ops":[...array of canvas ops...]}

CANVAS OPS — op types:

addFrame: {"type":"addFrame","id":"f1","title":"Hero","width":1440,"height":900,"x":0,"y":0}
addElement (rect): {"type":"addElement","frameId":"f1","element":{"type":"rect","x":0,"y":0,"width":400,"height":200,"zIndex":1,"fill":"#818cf8"}}
addElement (text): {"type":"addElement","frameId":"f1","element":{"type":"text","x":20,"y":20,"width":360,"height":50,"zIndex":2,"content":"Hello World","fontSize":32,"color":"#ffffff","align":"center"}}
addElement (circle): {"type":"addElement","frameId":"f1","element":{"type":"circle","x":50,"y":50,"width":100,"height":100,"zIndex":1,"fill":"#f97316"}}
addElement (image): {"type":"addElement","frameId":"f1","element":{"type":"image","x":0,"y":0,"width":512,"height":512,"zIndex":1,"prompt":"a sunset over mountains, digital art","fit":"cover"}}
addElement (effect): {"type":"addElement","frameId":"f1","element":{"type":"effect","x":40,"y":40,"width":320,"height":180,"zIndex":1,"playing":true,"authoringMode":"code","shaderCode":"shader_type canvas_item;\\n\\nvoid fragment() {\\n  vec2 uv = UV;\\n  float t = TIME;\\n  vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0.0, 2.0, 4.0));\\n  COLOR = vec4(col, 1.0);\\n}"}}
updateElement: {"type":"updateElement","frameId":"f1","elementId":"elem-id","patch":{"fill":"#ff0000"}}
deleteElement: {"type":"deleteElement","frameId":"f1","elementId":"elem-id"}
deleteFrame: {"type":"deleteFrame","id":"f1"}

RULES:
- Always addFrame first, then addElements into it
- Element x,y are relative to frame (top-left = 0,0)  
- Always include zIndex. Text on top of rect = text has higher zIndex
- Frame default size: 1440x900 for screens, 400x300 for small components
- Multiple frames: offset x by (previous frame width + 100)
- Colors: "#0f172a"=dark-bg, "#818cf8"=indigo, "#4f46e5"=indigo-dark, "#ffffff"=white, "#94a3b8"=gray, "#f97316"=orange, "#10b981"=green, "#ef4444"=red
- If context includes a selected element id and user asks to modify that element, use updateElement with that exact elementId.
- For color requests like "make this red", update patch.fill for shapes and patch.fill or patch.color for text, depending on the selected node type.
- For animated shader/effect/rainbow requests, use addElement with element.type="effect" and include shaderCode plus playing:true unless user asks to pause.
- For image requests (photos, illustrations, backgrounds, icons, logos, artwork), use addElement with element.type="image" and include a descriptive "prompt" field. The server will generate the image from the prompt. Write detailed, specific prompts for best results. fit can be "cover" (default), "contain", or "fill".
- NEVER say you can't draw. ALWAYS produce ops when user asks for visuals.
- Reply field: 1-2 sentences max, confirm what was created.

EXAMPLE — user: "draw a login form"
{"reply":"Created a login form with email/password fields and a sign-in button.","ops":[{"type":"addFrame","id":"login","title":"Login Form","width":480,"height":600,"x":0,"y":0},{"type":"addElement","frameId":"login","element":{"type":"rect","x":0,"y":0,"width":480,"height":600,"zIndex":0,"fill":"#0f172a"}},{"type":"addElement","frameId":"login","element":{"type":"text","x":40,"y":80,"width":400,"height":50,"zIndex":1,"content":"Sign In","fontSize":32,"color":"#ffffff"}},{"type":"addElement","frameId":"login","element":{"type":"rect","x":40,"y":180,"width":400,"height":52,"zIndex":1,"fill":"#1e293b","cornerRadius":8,"stroke":"#334155","strokeWidth":1}},{"type":"addElement","frameId":"login","element":{"type":"text","x":52,"y":196,"width":376,"height":20,"zIndex":2,"content":"Email","fontSize":14,"color":"#94a3b8"}},{"type":"addElement","frameId":"login","element":{"type":"rect","x":40,"y":252,"width":400,"height":52,"zIndex":1,"fill":"#1e293b","cornerRadius":8,"stroke":"#334155","strokeWidth":1}},{"type":"addElement","frameId":"login","element":{"type":"text","x":52,"y":268,"width":376,"height":20,"zIndex":2,"content":"Password","fontSize":14,"color":"#94a3b8"}},{"type":"addElement","frameId":"login","element":{"type":"rect","x":40,"y":356,"width":400,"height":52,"zIndex":1,"fill":"#818cf8","cornerRadius":8}},{"type":"addElement","frameId":"login","element":{"type":"text","x":40,"y":370,"width":400,"height":24,"zIndex":2,"content":"Sign In","fontSize":16,"color":"#ffffff","align":"center"}}]}`;

// ── Router ────────────────────────────────────────────────────────────────────

export const designChatRouter = router({
	sendMessage: publicProcedure
		.input(
			z.object({
				message: z.string().min(1).max(10000),
				documentJson: z.string().optional(),
				selectedFrameId: z.string().nullable().optional(),
				selectedElementId: z.string().nullable().optional(),
				selectedElementJson: z.string().optional(),
			}),
		)
		.output(
			z.object({
				reply: z.string(),
				ops: z.array(z.any()),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const apiKey = ctx.env.OPENROUTER_API_KEY;
			if (!apiKey) {
				return { reply: "Missing OPENROUTER_API_KEY.", ops: [] };
			}

			const openrouter = createOpenRouter({ apiKey });
			const model = openrouter("anthropic/claude-3-5-sonnet");

			const contextLines: string[] = [];
			if (input.selectedElementId)
				contextLines.push(`Selected element: ${input.selectedElementId}`);
			else if (input.selectedFrameId)
				contextLines.push(`Selected frame: ${input.selectedFrameId}`);

			if (input.selectedElementJson) {
				try {
					const el = JSON.parse(input.selectedElementJson);
					const props = [];
					if (el.type) props.push(`type=${el.type}`);
					if (el.width) props.push(`w=${el.width}`);
					if (el.height) props.push(`h=${el.height}`);
					if (el.fill) props.push(`fill=${el.fill}`);
					if (el.color) props.push(`color=${el.color}`);
					if (el.content)
						props.push(`content="${String(el.content).slice(0, 50)}"`);
					if (el.fontSize) props.push(`fontSize=${el.fontSize}`);
					if (el.x !== undefined) props.push(`x=${el.x}`);
					if (el.y !== undefined) props.push(`y=${el.y}`);
					contextLines.push(`Selected element properties: ${props.join(", ")}`);
				} catch {
					/* ignore */
				}
			}

			if (input.documentJson) {
				try {
					const doc = JSON.parse(input.documentJson);
					const children = Array.isArray(doc.children) ? doc.children : [];
					const frameLikeNodes = children.filter(
						(node: any) =>
							node && (node.type === "frame" || node.type === "group"),
					) as any[];
					if (children.length === 0) {
						contextLines.push("Canvas is empty.");
					} else if (frameLikeNodes.length === 0) {
						contextLines.push(`Canvas has ${children.length} top-level nodes.`);
					} else {
						const frameList = frameLikeNodes
							.map(
								(f: any) =>
									`id="${f.id}" name="${f.name ?? f.id}" pos=(${f.x ?? 0},${f.y ?? 0}) size=${f.width ?? 0}x${f.height ?? 0} children=${Array.isArray(f.children) ? f.children.length : 0}`,
							)
							.join("; ");
						contextLines.push(`Existing frames: ${frameList}`);
						const maxX = Math.max(
							...frameLikeNodes.map((f: any) => (f.x ?? 0) + (f.width ?? 1440)),
						);
						contextLines.push(`New frames: start at x=${maxX + 100}`);
					}
				} catch {
					/* ignore */
				}
			}

			const prompt =
				contextLines.length > 0
					? `${input.message}\n\n[Canvas Context]\n${contextLines.join("\n")}`
					: input.message;

			try {
				const { text } = await generateText({
					model,
					system: SYSTEM_PROMPT,
					prompt,
					maxOutputTokens: 2048,
				});

				const jsonText = text
					.replace(/^```json\s*/i, "")
					.replace(/^```\s*/i, "")
					.replace(/\s*```$/i, "")
					.trim();

				const parsed = JSON.parse(jsonText);
				const ops: any[] = Array.isArray(parsed.ops) ? parsed.ops : [];

				// ── Generate images for any image elements with a prompt ──
				const imagePromises: Promise<void>[] = [];
				for (const op of ops) {
					if (op?.type !== "addElement") continue;
					const el = op.element;
					if (el?.type !== "image" || !el.prompt) continue;

					imagePromises.push(
						generateImageUrl(ctx.env, el.prompt, el.width, el.height)
							.then((url) => {
								el.url = url;
								delete el.prompt;
							})
							.catch((err) => {
								console.error("[designChat] image gen failed:", err?.message ?? err);
								el.url = "";
								delete el.prompt;
							}),
					);
				}

				if (imagePromises.length > 0) {
					await Promise.all(imagePromises);
				}

				return {
					reply: String(parsed.reply ?? "Done."),
					ops,
				};
			} catch (err: any) {
				console.error("[designChat] error:", err?.message ?? err);
				return { reply: "Something went wrong. Please try again.", ops: [] };
			}
		}),
});

// ── Image generation via Scenario.com ─────────────────────────────────────────

async function generateImageUrl(
	env: {
		SCENARIO_API_KEY?: string;
		SCENARIO_SECRET_API_KEY?: string;
		SCENARIO_API_URL?: string;
	},
	prompt: string,
	width?: number,
	height?: number,
): Promise<string> {
	const client = createScenarioClient(env);
	const imageClient = new ScenarioImageClient(client);

	const jobId = await imageClient.createGenerationJob({
		prompt,
		width: clampToMultipleOf8(width ?? 512, 256, 1024),
		height: clampToMultipleOf8(height ?? 512, 256, 1024),
		numSamples: 1,
	});

	const assetIds = await client.pollJobUntilComplete(jobId);
	if (assetIds.length === 0) throw new Error("No assets generated");

	const { url } = await client.getAssetDetails(assetIds[0]);
	return url;
}

function clampToMultipleOf8(value: number, min: number, max: number): number {
	const clamped = Math.max(min, Math.min(max, value));
	return Math.round(clamped / 8) * 8;
}
