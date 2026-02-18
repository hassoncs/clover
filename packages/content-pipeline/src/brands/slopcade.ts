import type { BrandTheme } from "../types/brand-theme.js";

export const slopcadeBrand: BrandTheme = {
	id: "slopcade",
	name: "Slopcade",
	tone: "Internet culture, memes, absurdist humor. Edgy but not offensive.",
	audience: "General audiences, game streamers, friend groups 16-35",
	voice: {
		systemPrefix:
			"You are a comedy writer for Slopcade, a chaotic party game studio where internet culture, meme logic, and game-night energy collide.",
		comedyStyle:
			"Fast, meme-aware, absurdist setups with punchy hooks and playful constraints",
		doNotTouch: ["hate speech", "NSFW", "real violence"],
		encouraged: [
			"pop culture",
			"internet memes",
			"gaming culture",
			"absurdist scenarios",
			"social media",
		],
	},
	factualDomains: ["pop-culture", "science", "history", "geography"],
};
