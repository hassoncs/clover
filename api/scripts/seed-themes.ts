import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const now = Date.now();
const systemUserId = "00000000-0000-0000-0000-000000000001";

const themes = [
	{
		id: randomUUID(),
		name: "Halloween Horror",
		promptModifier:
			"Spooky Halloween aesthetic with haunted houses, jack-o-lanterns glowing orange, twisted bare trees, full moon, bats, cobwebs, and an eerie purple-green fog. Dark shadows with glowing eyes lurking. Gothic horror cartoon style with a playful twist.",
	},
	{
		id: randomUUID(),
		name: "Candy Kingdom",
		promptModifier:
			"Sweet candy land with lollipop trees, gumdrop bushes, chocolate rivers, cotton candy clouds, and gingerbread structures. Bright pastel colors - pink, mint green, baby blue, and sunny yellow. Glossy, sugary cartoon textures that look deliciously edible.",
	},
	{
		id: randomUUID(),
		name: "Synthwave Arcade",
		promptModifier:
			"Retro 80s synthwave aesthetic with neon pink and cyan grid lines, chrome metallic surfaces, palm tree silhouettes against sunset gradients, glowing wireframe mountains, and VHS scan lines. Pixel art style, futuristic yet nostalgic, like a neon-drenched arcade from the future.",
	},
	{
		id: randomUUID(),
		name: "Enchanted Forest",
		promptModifier:
			"Magical fantasy forest with towering ancient trees, glowing mushrooms, floating fireflies, mystical fog, fairy dust particles, and hidden woodland creatures. Dappled sunlight filtering through emerald canopy. Whimsical cartoon style with mysterious atmosphere.",
	},
	{
		id: randomUUID(),
		name: "Deep Sea Adventure",
		promptModifier:
			"Underwater ocean world with vibrant coral reefs, bioluminescent jellyfish, treasure chests, sunken ships, schools of tropical fish, and mysterious deep-sea creatures. Shafts of light penetrating the blue depths. Rich teals, deep blues, and pops of bright orange and yellow. Cartoon illustration style.",
	},
];

const values = themes
	.map(
		(t) =>
			`('${t.id}', '${t.name.replace(/'/g, "''")}', '${t.promptModifier.replace(/'/g, "''")}', '${systemUserId}', 1, ${now}, ${now})`,
	)
	.join(",\n  ");

const sql = `
INSERT OR IGNORE INTO themes (id, name, prompt_modifier, creator_user_id, is_public, created_at, updated_at)
VALUES
  ${values};
`;

console.log("Seeding public themes...");
console.log(sql);

const tempFile = "/tmp/seed-themes.sql";
writeFileSync(tempFile, sql);

try {
	const cwd = process.cwd().includes("/api")
		? process.cwd()
		: resolve(process.cwd(), "api");
	execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, {
		stdio: "inherit",
		cwd,
	});
	console.log("✅ Public themes seeded successfully");
	console.log(`   Created ${themes.length} themes:`);
	for (const t of themes) {
		console.log(`   - ${t.name}`);
	}
} finally {
	unlinkSync(tempFile);
}
