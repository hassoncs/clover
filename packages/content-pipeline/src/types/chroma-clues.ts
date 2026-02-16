import { z } from "zod";

export const ColorClueSchema = z.object({
	hue: z.number().min(0).max(360),
	saturation: z.number().min(0).max(100),
	clues: z.array(z.string()).min(1),
	bannedColorNames: z.array(z.string()),
});
export type ColorClue = z.infer<typeof ColorClueSchema>;

export const ColorCluePackSchema = z.array(ColorClueSchema);
export type ColorCluePack = z.infer<typeof ColorCluePackSchema>;
