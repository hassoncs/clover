/**
 * Brand Content Policy
 *
 * Content zones for AI generation and content moderation.
 * Used to ensure brand-appropriate content across all platforms.
 */

/**
 * GREEN ZONE: Universally safe Bible topics
 *
 * These topics are appropriate for all Christian audiences regardless of denomination.
 * Safe for AI generation without additional guidance.
 */
export const GREEN_ZONE_TOPICS: string[] = [
	"love",
	"faith",
	"hope",
	"prayer",
	"worship",
	"grace",
	"forgiveness",
	"compassion",
	"kindness",
	"patience",
	"joy",
	"peace",
	"gentleness",
	"faithfulness",
	"self-control",
	"creation",
	"miracles",
	"parables",
	"proverbs",
	"psalms",
	"ten commandments",
	"beatitudes",
	"fruits of the spirit",
	"armor of god",
	"noahs ark",
	"david and goliath",
	"daniel and the lions den",
	"jonah and the whale",
	"birth of jesus",
	"christmas story",
	"easter story",
	"resurrection",
	"good samaritan",
	"prodigal son",
	"loaves and fishes",
	"walking on water",
	"last supper",
	"lord prayer",
	"great commission",
	"golden rule",
	"great commandment",
];

/**
 * RED ZONE: Denominationally contentious topics to avoid
 *
 * These topics have significant theological disagreement between denominations.
 * AI generation should NEVER produce content on these topics.
 */
export const RED_ZONE_TOPICS: string[] = [
	"predestination",
	"calvinism",
	"arminianism",
	"once saved always saved",
	"eternal security",
	"baptism regeneration",
	"infant baptism",
	"believers baptism",
	"transubstantiation",
	"real presence",
	"communion wine",
	"priestly celibacy",
	"papal authority",
	"pope infallibility",
	"mary immaculate conception",
	"mary assumption",
	"mary intercession",
	"saints intercession",
	"praying to saints",
	"purgatory",
	"indulgences",
	"speaking in tongues",
	"baptism of the holy spirit",
	"faith healing",
	"prosperity gospel",
	"women ordination",
	"female pastors",
	"lgbtq ordination",
	"same sex marriage",
	"divorce remarriage",
	"contraception",
	"birth control",
	"abortion",
	"capital punishment",
	"war just war theory",
	"end times rapture",
	"tribulation",
	"millennium",
	"antichrist",
	"young earth creationism",
	"old earth creationism",
	"theistic evolution",
	"sabbath saturday sunday",
	"tithing mandatory",
	"alcohol consumption",
	"gambling",
	"tattoos",
	"women head coverings",
];

/**
 * YELLOW ZONE: Topics requiring careful handling with guidance
 *
 * These topics can be addressed but require specific guidance to remain
 * denominationally neutral and appropriate.
 */
export const YELLOW_ZONE_TOPICS: Array<{ topic: string; guidance: string }> = [
	{
		topic: "baptism",
		guidance:
			"Present baptism as an important Christian ordinance without specifying mode (immersion vs sprinkling) or age (infant vs believer). Focus on the symbolism of new life in Christ.",
	},
	{
		topic: "communion",
		guidance:
			"Refer to Communion/Lords Supper as a memorial and celebration of Christs sacrifice. Avoid theological claims about the nature of the elements.",
	},
	{
		topic: "church leadership",
		guidance:
			"Use inclusive terms like pastors, elders, ministers. Avoid hierarchical titles that imply specific church governance structures.",
	},
	{
		topic: "salvation",
		guidance:
			"Present salvation as through faith in Jesus Christ. Avoid specifying the exact moment or mechanism of salvation.",
	},
	{
		topic: "holy spirit",
		guidance:
			"Describe the Holy Spirits role in guiding, comforting, and empowering believers. Avoid charismatic vs cessationist debates.",
	},
	{
		topic: "prayer methods",
		guidance:
			"Present prayer as communication with God. Avoid prescribing specific postures, formulas, or methods.",
	},
	{
		topic: "bible interpretation",
		guidance:
			"Encourage scripture reading and study. Avoid endorsing specific interpretive frameworks (literal vs metaphorical).",
	},
	{
		topic: "worship style",
		guidance:
			"Present worship as honoring God. Avoid prescribing specific musical styles, liturgical vs contemporary debates.",
	},
	{
		topic: "fasting",
		guidance:
			"Present fasting as a spiritual discipline. Avoid prescribing mandatory fasting or specific durations.",
	},
	{
		topic: "giving",
		guidance:
			"Encourage generous giving as a spiritual practice. Avoid prescribing specific percentages or mandatory tithing.",
	},
];

/**
 * AMEN System Prompt Prefix for AI Content Generation
 *
 * This prefix is prepended to all AI generation requests for the Amen brand
 * to ensure content aligns with brand values and content policy.
 */
export const AMEN_SYSTEM_PREFIX = `You are creating content for Amen, a Christian party game platform. Your content must:

1. BE REVERENT: Never mock, trivialize, or be irreverent toward faith, scripture, or Christian practice.

2. BE EDUCATIONAL: Help players learn about the Bible, Christian history, and spiritual concepts in an engaging way.

3. BE WARM: Use a friendly, welcoming tone that invites fellowship and community.

4. BE INCLUSIVE: Content should be appropriate for all Christian denominations. Avoid topics that are denominationally divisive.

5. INCLUDE SCRIPTURE: All content should reference or be grounded in scripture. Include verse references where appropriate.

6. STAY IN GREEN ZONE: Only generate content on universally accepted Christian topics. Avoid controversial theological debates.

7. RESPECT BOUNDARIES: Never generate content involving violence, romance, politics, horror, or occult themes.

Remember: The goal is to create games that bring people together around scripture and fellowship, not to advance any particular theological position.`;
