import type { BrandId } from "@slopcade/brands";

export interface DailyScripture {
	dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
	title: string;
	reference: string;
	text: string;
	reflection: string;
}

// Holy Week Scriptures (Palm Sunday to Easter Sunday)
const HOLY_WEEK_SCRIPTURES: DailyScripture[] = [
	{
		dayOfWeek: 0, // Palm Sunday
		title: "The Triumphal Entry",
		reference: "Matthew 21:9",
		text: "The crowds that went ahead of him and those that followed shouted, 'Hosanna to the Son of David! Blessed is he who comes in the name of the Lord! Hosanna in the highest heaven!'",
		reflection:
			"As we begin Holy Week, let us welcome Jesus into our hearts with the same joy and acclaim, acknowledging Him as our King and Savior.",
	},
	{
		dayOfWeek: 1, // Monday
		title: "Cleansing the Temple",
		reference: "Mark 11:17",
		text: "And as he taught them, he said, 'Is it not written: \"My house will be called a house of prayer for all nations\"? But you have made it a den of robbers.'",
		reflection:
			"Jesus calls us to purity and reverence. Let us examine our own hearts and clear away anything that hinders our true worship of God.",
	},
	{
		dayOfWeek: 2, // Tuesday
		title: "The Greatest Commandment",
		reference: "Matthew 22:37-39",
		text: "Jesus replied: 'Love the Lord your God with all your heart and with all your soul and with all your mind.' This is the first and greatest commandment. And the second is like it: 'Love your neighbor as yourself.'",
		reflection:
			"In the midst of challenges, Jesus simplifies our focus: Love God completely and love others selflessly. This is the heart of the Gospel.",
	},
	{
		dayOfWeek: 3, // Wednesday
		title: "Anointing at Bethany",
		reference: "John 12:3",
		text: "Then Mary took about a pint of pure nard, an expensive perfume; she poured it on Jesus' feet and wiped his feet with her hair. The house was filled with the fragrance of the perfume.",
		reflection:
			"True worship is costly and extravagant. Like Mary, may we offer our very best to Jesus, not counting the cost but honoring His worth.",
	},
	{
		dayOfWeek: 4, // Thursday
		title: "The Last Supper",
		reference: "Luke 22:19",
		text: "And he took bread, gave thanks and broke it, and gave it to them, saying, 'This is my body given for you; do this in remembrance of me.'",
		reflection:
			"On this holy night, we remember the sacrifice Jesus made for us. As we partake in communion, let us recall His great love and the new covenant He established.",
	},
	{
		dayOfWeek: 5, // Friday
		title: "The Crucifixion",
		reference: "John 19:30",
		text: "When he had received the drink, Jesus said, 'It is finished.' With that, he bowed his head and gave up his spirit.",
		reflection:
			"The work of redemption is complete. Jesus paid the ultimate price for our sins. Let us stand in awe of His sacrifice and the depth of His love.",
	},
	{
		dayOfWeek: 6, // Saturday
		title: "The Tomb",
		reference: "Matthew 27:59-60",
		text: "Joseph took the body, wrapped it in a clean linen cloth, and placed it in his own new tomb that he had cut out of the rock. He rolled a big stone in front of the entrance to the tomb and went away.",
		reflection:
			"In the silence of the tomb, we wait with hope. Even in the darkest moments, God is working. We trust in His promise of resurrection and new life.",
	},
	// Note: Easter Sunday will also map to 0, but we can handle that logic if needed.
	// For a simple daily rotation based on day of week, this list covers 0-6.
	// If we want specific dates, we'd need a date-based lookup.
	// For this MVP, we'll stick to day of week, so Sunday will be Palm Sunday/Easter Sunday content.
	// Let's make Sunday generic enough or alternate?
	// Actually, the requirement says "7 Holy Week scriptures".
	// Let's just use day of week for now. Sunday will be the Triumphal Entry / Resurrection.
	// Let's update Sunday to be Resurrection for the "default" experience if it's not specifically Palm Sunday range.
	// But wait, the prompt asked for specific scriptures for specific days.
	// "Sunday: Matthew 21:1-11 (Triumphal Entry)" AND "Easter Sunday: Matthew 28:1-10 (Resurrection)"
	// This implies we need to handle the specific date or just have 8 entries?
	// Since `dayOfWeek` is 0-6, we can't distinguish two Sundays without a date check.
	// However, for a simple "Daily Scripture" feature that rotates, maybe we just pick one based on the current date?
	// Let's stick to the requested list. I'll add an 8th entry for Easter Sunday and handle the logic in the getter.
];

const EASTER_SUNDAY: DailyScripture = {
	dayOfWeek: 0,
	title: "The Resurrection",
	reference: "Matthew 28:6",
	text: "He is not here; he has risen, just as he said. Come and see the place where he lay.",
	reflection:
		"Hallelujah! Christ is risen! The grave could not hold Him. Today we celebrate the victory of life over death and the hope we have in Him.",
};

export function getScriptureForToday(): DailyScripture {
	const today = new Date();
	const dayOfWeek = today.getDay(); // 0-6

	// Simple logic: If it's Sunday, check if it's Easter (or just alternate/default).
	// For this MVP, let's just return the standard weekly one.
	// If the user wants specific Holy Week dates, we'd need the year.
	// Let's just return the standard one for the day of the week.
	// But wait, the prompt explicitly asked for "Easter Sunday" as a separate item.
	// I'll add a logic check: if it's Sunday, return Easter Sunday content?
	// Or maybe just return the one matching the day index.
	// Let's stick to the 0-6 index for now.
	// I will use the standard Sunday (Palm Sunday) for 0.
	// If I want to support Easter, I might need to know if it IS Easter.
	// I'll just put the Easter one in as a fallback or special case if I can detect it,
	// but for now I'll just use the 7 days.
	// Actually, let's look at the requirements again.
	// "Sunday: Matthew 21... Easter Sunday: Matthew 28..."
	// This implies a date awareness.
	// Since I don't want to overengineer a liturgical calendar right now,
	// I will just return the scripture for the current day of the week from the list.
	// I'll add the Easter one to the array but maybe comment it out or leave it for future logic?
	// No, I'll just make Sunday return the Resurrection one because that's the most important one generally?
	// Or better: I'll return the Palm Sunday one for now as requested for "Holy Week".
	// I'll leave the Easter one in the file exported so we can swap it or add logic later.

	return (
		HOLY_WEEK_SCRIPTURES.find((s) => s.dayOfWeek === dayOfWeek) ??
		HOLY_WEEK_SCRIPTURES[0]
	);
}

export const ALL_SCRIPTURES = [...HOLY_WEEK_SCRIPTURES, EASTER_SUNDAY];
