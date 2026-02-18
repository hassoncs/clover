import type { BrandTheme } from "../types/brand-theme.js";

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
