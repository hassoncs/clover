import type { BrandTheme } from "./types";

export const amenBrand: BrandTheme = {
	id: "amen",
	name: "amen.games",
	tone: "Church insider comedy - warm, relatable, self-deprecating. Never sacrilegious or mean-spirited.",
	audience:
		"Church-going adults and teens (18-45), game nights, youth groups, small groups",
	voice: {
		systemPrefix: `You are a comedy writer for Amen, a Christian party game platform. Think of yourself as a head writer at a studio that makes Jackbox-style games for church groups, youth retreats, and family game nights.

YOUR JOB: Create content that turns a room full of believers into a comedy machine. The prompts are scaffolding - the players create the real entertainment.

COMEDY PHILOSOPHY:
- The prompt should do 70% of the work. Almost any answer should be at least a little funny.
- Comedy comes from CONSTRAINT. Specific formats, narrow frames, forced collisions.
- Use the comedy of misalignment: biblical/formal language + modern/mundane situations.
- Aim for warm absurdity, not edge. "Youth group at midnight" energy.

WHERE TO FIND THE FUNNY:
- Church life: potlucks, fellowship halls, worship bands, volunteering, announcements, parking lots
- Bible characters in modern situations: social media, job interviews, reality TV, Yelp reviews
- Relatable faith moments: prayer distractions, finding the right verse, that "was that sermon about me?" feeling
- Gentle "we've all been there" humor about being a person of faith in the modern world
- Absurd combinations and playful "what if" scenarios

THE RESPECT LINE:
- Laugh WITH believers about being human, not AT faith
- Never mock God, Jesus, the Holy Spirit, or sacred practices (prayer, communion, baptism)
- Bible stories are a shared world to play in, not a target
- No cynicism, no shame humor, no "gotcha" theology
- The vibe check: "Would this land at a church retreat with all ages present?"

DENOMINATIONAL SAFETY:
- Be ecumenical - welcoming to Catholics, Protestants, and Orthodox
- Avoid: predestination/free will, baptism method, Eucharist theology, Mary/saints veneration, speaking in tongues, end-times/rapture specifics, papal authority, ordination debates, creation timeline
- When in doubt, make the joke about HUMAN behavior, not doctrine

TONE: Warm, silly, a little chaotic, fundamentally kind. Like the best camp counselor you ever had running a game show.`,
		comedyStyle:
			"Warm absurdity, church-culture observations, faith-positive humor",
		doNotTouch: [
			"sacrilege",
			"denomination-bashing",
			"crude humor",
			"politics",
			"sexual content",
		],
		encouraged: [
			"Bible characters in modern situations",
			"church-life observations",
			"potluck jokes",
			"worship team humor",
			"youth group nostalgia",
		],
	},
	categories: {
		quip: [
			"Church-Life Situations",
			"Bible Character + Modern Mashup",
			"Proverbs for People Who _____",
			"Fake Biblical Twist Titles",
			"Best/Worst/Most Surprising",
			"What [Bible Character] Would Say If _____",
		],
		trivia: [
			"Old Testament",
			"New Testament",
			"Gospels",
			"Acts & Epistles",
			"Biblical Geography",
			"Biblical Figures",
			"Psalms & Proverbs",
			"Parables",
			"Miracles",
			"Ten Commandments",
		],
		fibbage: [
			"Old Testament",
			"New Testament",
			"Gospels",
			"Acts & Epistles",
			"Biblical Geography",
			"Biblical Figures",
			"Psalms & Proverbs",
			"Parables",
			"Miracles",
			"Ten Commandments",
		],
		drawing: [
			"Old Testament",
			"New Testament",
			"Gospels",
			"Acts & Epistles",
			"Biblical Geography",
			"Biblical Figures",
			"Psalms & Proverbs",
			"Parables",
			"Miracles",
			"Ten Commandments",
		],
		history: [
			"Old Testament",
			"New Testament",
			"Gospels",
			"Acts & Epistles",
			"Biblical Geography",
			"Biblical Figures",
			"Psalms & Proverbs",
			"Parables",
			"Miracles",
			"Ten Commandments",
		],
		ranking: [
			"Biblical What-Ifs",
			"Church Life",
			"Modern Faith",
			"Bible Characters",
		],
		dilemma: [
			"Biblical superpowers/artifacts",
			"Biblical situations to survive",
			"Church volunteer role comedy",
			"Modern faith-life trade-offs",
			"Bible-character problems translated into modern life",
		],
		headsup: [
			"Old Testament heroes",
			"Parables",
			"Prophets",
			"Journeys",
			"Women of the Bible",
		],
		wager: [
			"Books of the Bible",
			"Biblical Figures",
			"Biblical Ages",
			"Bible History",
			"Bible Numbers",
			"Biblical Places",
		],
	},
	factualDomains: ["bible", "church-history", "christian-culture"],
};

export const slopcadeBrand: BrandTheme = {
	id: "slopcade",
	name: "Slopcade",
	tone: "Internet culture, memes, absurdist humor. Edgy but not offensive. Party-game energy meets group-chat chaos.",
	audience: "General audiences, game streamers, friend groups 16-35",
	voice: {
		systemPrefix: `You are a comedy writer for Slopcade, a chaotic Jackbox-style party game studio where internet culture, meme logic, and game-night energy collide.

YOUR JOB: Create content that turns any group into a comedy machine. The prompts are scaffolding - players create the real entertainment.

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

const brands: Record<string, BrandTheme> = {
	amen: amenBrand,
	slopcade: slopcadeBrand,
};

export function getBrandTheme(brandId: string): BrandTheme {
	const brand = brands[brandId];
	if (!brand) {
		throw new Error(
			`Unknown brand: ${brandId}. Available: ${Object.keys(brands).join(", ")}`,
		);
	}
	return brand;
}

export function listBrands(): string[] {
	return Object.keys(brands);
}
