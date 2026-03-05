import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { publicProcedure, router } from "@/trpc/index";

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
			if (input.selectedElementJson) {
				try {
					const el = JSON.parse(input.selectedElementJson);
					const props = [];
					if (el.type) props.push(`type=${el.type}`);
					if (el.width) props.push(`w=${el.width}`);
					if (el.height) props.push(`h=${el.height}`);
					if (el.fill) props.push(`fill=${el.fill}`);
					if (el.color) props.push(`color=${el.color}`);
					if (el.content) props.push(`content="${String(el.content).slice(0, 50)}"`);
					if (el.fontSize) props.push(`fontSize=${el.fontSize}`);
					if (el.x !== undefined) props.push(`x=${el.x}`);
					if (el.y !== undefined) props.push(`y=${el.y}`);
					contextLines.push(`Selected element properties: ${props.join(", ")}`);
				} catch { /* ignore */ }
			}
			else if (input.selectedElementId) contextLines.push(`Selected element: ${input.selectedElementId}`);
			else if (input.selectedFrameId) contextLines.push(`Selected frame: ${input.selectedFrameId}`);

			if (input.documentJson) {
				try {
					const doc = JSON.parse(input.documentJson);
					const frames = (doc.frames ?? []) as any[];
					if (frames.length === 0) {
						contextLines.push("Canvas is empty.");
					} else {
						const frameList = frames.map((f: any) =>
							`id="${f.id}" title="${f.title}" pos=(${f.position?.x ?? 0},${f.position?.y ?? 0}) size=${f.width}x${f.height} elements=${f.elements?.length ?? 0}`
						).join("; ");
						contextLines.push(`Existing frames: ${frameList}`);
						const maxX = Math.max(...frames.map((f: any) => (f.position?.x ?? 0) + (f.width ?? 1440)));
						contextLines.push(`New frames: start at x=${maxX + 100}`);
					}
				} catch { /* ignore */ }
			}

			const prompt = contextLines.length > 0
				? `${input.message}\n\n[Canvas Context]\n${contextLines.join("\n")}`
				: input.message;

			try {
				const { text } = await generateText({
					model,
					system: SYSTEM_PROMPT,
					prompt,
					maxOutputTokens: 2048,
				});

				// Extract JSON — handle cases where model wraps in code block
				const jsonText = text
					.replace(/^```json\s*/i, "")
					.replace(/^```\s*/i, "")
					.replace(/\s*```$/i, "")
					.trim();

				const parsed = JSON.parse(jsonText);

				return {
					reply: String(parsed.reply ?? "Done."),
					ops: Array.isArray(parsed.ops) ? parsed.ops : [],
				};
			} catch (err: any) {
				console.error("[designChat] error:", err?.message ?? err);
				return { reply: "Something went wrong. Please try again.", ops: [] };
			}
		}),
});
