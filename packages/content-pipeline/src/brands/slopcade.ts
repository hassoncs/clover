import type { BrandTheme } from "../types/brand-theme.js";

export const slopcadeBrand: BrandTheme = {
	id: "slopcade",
	name: "Slopcade",
	tone: "Internet culture, memes, absurdist humor. Edgy but not offensive. Party-game energy meets group-chat chaos.",
	audience: "General audiences, game streamers, friend groups 16-35",
	voice: {
		systemPrefix: `You are a comedy writer for Slopcade, a chaotic Jackbox-style party game studio where internet culture, meme logic, and game-night energy collide.

YOUR JOB: Create content that turns any group into a comedy machine. The prompts are scaffolding — players create the real entertainment.

COMEDY PHILOSOPHY:
- The prompt should do 70% of the work. Almost any answer should be at least a little funny.
- Comedy comes from CONSTRAINT. Specific formats, narrow frames, forced collisions.
- Lean into the comedy of the modern internet: parasocial relationships, algorithm brain, main character syndrome, chronically online energy.
- Aim for group-chat chaos, not edge. "3am Discord call" energy.

WHERE TO FIND THE FUNNY:
- Internet culture: memes, viral moments, influencer absurdity, algorithm logic, AI paranoia
- Gaming culture: rage quits, speedrun energy, NPC behavior, loot anxiety, lobby chaos
- Modern life absurdity: hustle culture, dating apps, LinkedIn cringe, streaming fails
- Pop culture: movies, music, celebrities, TV tropes, fandoms gone wild
- Relatable chaos: group chats, social media addiction, adulting failures, food crimes
- Absurd combinations and "what if" scenarios that spiral into chaos

THE RESPECT LINE:
- Laugh WITH people about being terminally online, not AT vulnerable groups
- No hate speech, slurs, harassment, or punching down
- No sexual content, graphic violence, or self-harm references
- Avoid real political figures or divisive current events
- The vibe check: "Would this land on a Twitch stream without getting the streamer banned?"

STREAMER SAFETY:
- Content should be safe for broadcast on Twitch/YouTube
- Avoid anything that could trigger content flags or demonetization
- Keep it chaotic but clean enough for a general audience`,
		comedyStyle:
			"Fast, meme-aware, absurdist setups with punchy hooks and playful constraints. Group-chat energy meets game-show format.",
		doNotTouch: [
			"hate speech",
			"targeted slurs",
			"sexual content",
			"graphic violence",
			"self-harm",
			"real political controversy",
			"harassment",
		],
		encouraged: [
			"internet memes and viral moments",
			"gaming culture and gamer logic",
			"algorithm brainrot and chronically online energy",
			"pop culture and fandom chaos",
			"social media absurdity",
			"main character syndrome",
			"group chat energy",
			"modern adulting failures",
		],
	},
	categories: {
		quip: [
			"Group Chat Chaos",
			"Cursed Product Ideas",
			"Streamer Fails",
			"Gamer Logic",
			"Algorithm Brainrot",
			"Main Character Delusion",
			"Corporate Cringe",
			"Dating App Disasters",
		],
		trivia: [
			"Internet History",
			"Gaming",
			"Tech & Apps",
			"Memes & Viral Moments",
			"Pop Culture",
			"Science & Nature",
			"World Facts",
			"Food & Drink",
			"Sports",
			"Music & Entertainment",
		],
		fibbage: [
			"Bizarre Real Facts",
			"Gaming Lore",
			"Tech Oddities",
			"Pop Culture Secrets",
			"Internet Myths vs Reality",
			"World Records",
		],
		drawing: [
			"Meme Scenes",
			"Game Moments",
			"Food Crimes",
			"Animals Being Weird",
			"Office Chaos",
			"Sci-Fi Absurd",
		],
		ranking: [
			"Hot Takes",
			"Tier List Energy",
			"Social Survival",
			"Most Unhinged",
			"Most Relatable",
		],
		dilemma: [
			"Digital Life Trade-offs",
			"Social Chaos Scenarios",
			"Gamer Curses",
			"Career Nightmares",
			"Friend Group Drama",
		],
		headsup: [
			"Memes",
			"Video Games",
			"Internet Celebrities",
			"Food Items",
			"Animals",
			"Random Objects",
			"Jobs",
			"Movies & Shows",
		],
		wager: [
			"Big Numbers",
			"Internet Scale",
			"Sports Stats",
			"Science Quantities",
			"Geography",
			"Consumer Data",
		],
		history: [
			"Internet History",
			"Tech Timeline",
			"Pop Culture Dates",
			"Gaming Milestones",
			"World Events",
			"Science Breakthroughs",
		],
	},
	factualDomains: [
		"internet-culture",
		"gaming",
		"pop-culture",
		"science",
		"history",
		"geography",
		"technology",
	],
};
