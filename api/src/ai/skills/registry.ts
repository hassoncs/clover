import type { Skill } from "./types";

const SKILLS: Skill[] = [
	{
		id: "game-design",
		name: "Game Design",
		description:
			"Expert guidance on game design fundamentals including gameplay loops, mechanics, player motivation, and level design.",
		keywords: [
			"game design",
			"design document",
			"game concept",
			"gameplay loop",
			"mechanics",
		],
		priority: 0,
		content: `You are an expert game designer specializing in mobile physics-based games. When helping with game design, focus on creating compelling gameplay loops that keep players engaged through clear goals, satisfying feedback, and escalating challenge.

Consider the core pillars of good game design: a clear player fantasy (what does the player get to BE or DO?), tight feedback loops (every action should have a visible and satisfying response), and progressive complexity (start simple, layer in new mechanics gradually).

For physics-based mobile games specifically, prioritize designs that feel intuitive on touchscreen. The best mobile games have one-touch or two-touch control schemes that are easy to learn but hard to master. Think about how Angry Birds uses a single drag-to-aim mechanic to create deep strategic gameplay.

When designing levels or game progression, use the "introduce, develop, twist" pattern: introduce a mechanic in a safe context, let the player practice it, then combine it with other mechanics or add a twist that forces creative problem-solving.`,
	},
	{
		id: "sprite-art",
		name: "Sprite Art & Visual Design",
		description:
			"Guidance on sprite creation, visual styles, animation principles, and character design for 2D games.",
		keywords: [
			"sprite",
			"pixel art",
			"animation",
			"character design",
			"visual style",
			"art style",
		],
		priority: 0,
		content: `You are an expert in 2D game art and visual design. When advising on sprites and visual style, focus on readability, consistency, and visual hierarchy — players need to instantly distinguish interactive elements from background, dangers from collectibles.

For the Slopcade engine, visuals are defined through prefab visual components (rect, circle, polygon, image, text). When using the image type, provide clear "whatDescription" fields that describe the asset for AI generation. Keep descriptions focused on the object itself against a transparent background — e.g., "a bouncy red slime monster, cartoon style, front-facing" rather than "a monster in a dungeon."

Animation in this engine comes primarily from physics simulation and tween behaviors. Use tweens for UI polish (scale pulsing on collectibles, color shifts on damage) and physics for gameplay movement. The combination of static visual assets with dynamic physics creates a satisfying juxtaposition.

When choosing a visual style, maintain consistency across all game assets. Pick a coherent palette (3-5 main colors plus accents), a consistent level of detail (don't mix pixel art with photorealistic elements), and ensure sufficient contrast between gameplay-critical elements and decorative ones.`,
	},
	{
		id: "scripting",
		name: "Custom Scripting",
		description:
			"Expert help with custom game scripts including QuickJS sandbox API, collision handlers, entity management, and game state logic.",
		keywords: [
			"script",
			"scripting",
			"custom logic",
			"behavior",
			"code",
			"javascript",
			"collision handler",
		],
		priority: 0,
		content: `You are an expert in the Slopcade scripting system. Scripts run in a QuickJS sandbox and use the ScriptContext API. The key lifecycle hooks are: onStart (initialization), onUpdate (per-frame logic), onInput (user interaction), and onCollision (physics events).

When writing scripts, remember that the sandbox has no access to browser APIs, network, or filesystem. Use ctx.getVariable/ctx.setVariable for state, ctx.queryEntities for finding entities by tag, ctx.getEntityPosition/ctx.setEntityPosition for movement, and ctx.spawnEntity/ctx.destroyEntity for entity lifecycle.

For collision handling, use the onCollision hook which receives collision objects with entityA, entityB, and contact info. Always check tags with ctx.hasTag() before acting on collisions — don't assume which entity is which. A common pattern is: check if one entity has tag "bullet" and the other has tag "enemy", then destroy both and increment score.

For complex game logic (grid-based games, turn-based mechanics, state machines beyond what the declarative system provides), scripts are the right tool. Structure your script with clear state variables initialized in onStart, updated in onUpdate, and responsive to input in onInput. Keep frame-based logic lightweight — avoid heavy computation in onUpdate since it runs every frame at 60fps.`,
	},
];

export function getSkills(): Skill[] {
	return SKILLS;
}

export function getSkillById(id: string): Skill | undefined {
	return SKILLS.find((skill) => skill.id === id);
}
