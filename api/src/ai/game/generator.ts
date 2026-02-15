import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { generateObject } from "ai";
import type { GameIntent } from "@/ai/game/classifier";
import { classifyPrompt } from "@/ai/game/classifier";
import { GameDefinitionSchema } from "@/ai/game/schemas";
import {
	type GameDefinitionValidationResult,
	validateGameDefinition,
} from "@/ai/game/validator";
import { createModel } from "@/ai/model-factory";

export type AIProvider = "openrouter";

export interface AIConfig {
	apiKey: string;
	model?: string;
}

const DEFAULT_MODEL = "openai/gpt-4o";

const SYSTEM_PROMPT = `You are a game designer AI that creates 2D physics-based mobile games for children ages 6-14.

Given a user's game description, generate a complete GameDefinition that can be immediately played.

## Guidelines

1. **Keep it simple**: 5-15 entities maximum
2. **Use clear entity names and IDs**: lowercase with hyphens (e.g., "player-cat", "platform-1")
3. **Script-First Logic**: All gameplay logic, win/lose conditions, and input handling MUST be implemented via scripts. Prefabs and entities should use 'scriptRef' to point to these scripts.
4. **Set reasonable physics values**:
   - density: 0.5-2.0 (1.0 is normal)
   - friction: 0.1-0.9 (0.5 is normal)
   - restitution: 0.0-0.9 (0 = no bounce, 0.8 = very bouncy)
5. **World Building**: Focus on placing entities in the world with correct transforms, visuals, and physics.
6. **Use tags consistently**: "player", "enemy", "collectible", "ground", "goal"
7. **Match sprite and physics sizes**: If sprite is 1m wide, physics box should be 1m wide
8. **Position entities properly**: Ground at bottom, player above ground, collectibles reachable

## Common Patterns

**Projectile Game** (Angry Birds style):
- Launcher entity with scriptRef pointing to a drag-to-aim script
- Projectiles spawned via script logic on input release
- Targets with tags for collision detection in scripts

**Platformer** (Jumpy Cat style):
- Player with scriptRef for jumping (tap) and movement (tilt/drag)
- Static platforms at various heights
- Collectibles with tags for detection in scripts

**Falling Objects** (Catch game):
- Catcher entity with scriptRef for movement
- World script or spawner entity script to create falling items on a timer

**Stacking** (Tower building):
- Moving spawner with scriptRef to spawn blocks on tap
- Blocks stack on ground/each other

**Match-3** (Candy Crush style):
- Use the Match3GameSystem by populating the 'match3' configuration object
- Set 'match3.rows' and 'match3.cols' between 4 and 12
- Provide 3 to 6 distinct piece prefabs in 'match3.piecePrefabs'
- Piece visuals and effects should be handled via piece scripts referenced by scriptRef


## World Coordinates

- World is in METERS, not pixels (pixelsPerMeter: 50 means 1 meter = 50 pixels)
- Typical world size: 10-20 meters wide, 12-16 meters tall
- Gravity: { x: 0, y: 10 } is standard (positive Y = down)
- Ground should be near the bottom (y: 11-15 depending on world height)`;

const REFINEMENT_SYSTEM_PROMPT = `You are a game designer AI that modifies existing 2D physics games based on user feedback.

## Instructions

1. Identify what needs to change based on the user's request
2. Make MINIMAL changes to satisfy the request
3. Preserve ALL unrelated parts of the game
4. Ensure the game still works after changes
5. Logic changes should be handled by updating script references or providing guidance for script changes.

## Common Modifications

| User Request | AI Action |
|--------------|-----------|
| "Make it bouncier" | Increase restitution on relevant entities |
| "Add more enemies" | Add more enemy entities with new positions |
| "Make jumping higher" | Adjust force parameters in scripts |
| "Slow down platforms" | Adjust speed parameters in scripts |
| "Make it easier" | Adjust difficulty parameters, add more lives |
| "Make it harder" | Speed up enemies, add obstacles, reduce time |
| "More things to collect" | Add more collectible entities |
| "Bigger player" | Increase sprite size AND physics size |`;

const ECONOMY_SIGNAL_REGEX =
	/\b(economy|resource|resources|currency|coin|coins|gold|gems|shop|upgrade|upgrades|market|trade|craft|crafting|energy|mana|stamina|idle|incremental|tycoon|management)\b/i;

const ECONOMY_GUIDANCE = `

Optional economy graph guidance (ONLY include economy when the user's prompt implies resources, currency, upgrades, progression, crafting, or market loops):

- The economy field is an object with: id, resourceTypes, nodes, and edges.
- Keep economy graphs small and deterministic-friendly for real-time simulation (3-8 nodes, 2-12 edges).
- Use only supported node types: source, drain, pool, gate, converter.
- Use only supported edge types: resource, state.

Economy archetypes:
- Resource loop: source -> pool -> drain
- Upgrade sink: source -> pool -> drain (shop/upgrades)
- Crafting loop: source(s) -> pool(s) -> converter -> pool/drain
- Risk-reward gate: source/pool -> gate -> pool/drain with probability

Deterministic constraints:
- Node IDs and edge IDs must be unique and reference existing nodes.
- Keep formulas simple and bounded constants where possible (e.g., "1", "2", "5").
- Gate probability values must be between 0 and 1 and total outgoing gate probability should be <= 1.
- Use explicit resourceTypes and ensure every node resource reference matches one of them.
- Avoid unconstrained free-form text in formulas/conditions.

Example economy graph:
{
  "id": "coin-loop",
  "resourceTypes": ["coins"],
  "nodes": [
    { "id": "coin-source", "type": "source", "label": "Coin Source", "resourceType": "coins" },
    { "id": "wallet", "type": "pool", "label": "Wallet", "resourceType": "coins", "initialValue": 0, "capacity": 200 },
    { "id": "shop", "type": "drain", "label": "Shop", "resourceType": "coins" }
  ],
  "edges": [
    { "id": "e1", "type": "resource", "from": "coin-source", "to": "wallet", "formula": "2" },
    { "id": "e2", "type": "resource", "from": "wallet", "to": "shop", "formula": "1" }
  ]
}`;

export interface GenerationOptions {
	maxRetries?: number;
	temperature?: number;
}

export interface GenerationResult {
	success: boolean;
	game?: GameDefinition;
	error?: {
		code:
			| "INVALID_PROMPT"
			| "GENERATION_FAILED"
			| "VALIDATION_FAILED"
			| "API_ERROR";
		message: string;
		suggestions?: string[];
	};
	intent?: GameIntent;
	validationResult?: GameDefinitionValidationResult;
	retryCount?: number;
}

export interface RefinementResult {
	success: boolean;
	game?: GameDefinition;
	error?: {
		code:
			| "INVALID_GAME"
			| "REFINEMENT_FAILED"
			| "VALIDATION_FAILED"
			| "API_ERROR";
		message: string;
		suggestions?: string[];
	};
	validationResult?: GameDefinitionValidationResult;
}

function shouldIncludeEconomyGuidance(
	prompt: string,
	intent: GameIntent,
): boolean {
	if (ECONOMY_SIGNAL_REGEX.test(prompt)) {
		return true;
	}

	return intent.specialRequests.some((request) =>
		ECONOMY_SIGNAL_REGEX.test(request),
	);
}

export function buildGenerationPrompt(
	prompt: string,
	intent: GameIntent,
): string {
	let basePrompt = `Create a game based on this description: "${prompt}"

Detected game type: ${intent.gameType}
Theme: ${intent.theme}
Player action: ${intent.playerAction}
Goal: ${intent.targetAction}
Control style: ${intent.controlIntent}
Difficulty: ${intent.difficulty}
${intent.specialRequests.length > 0 ? `Special requests: ${intent.specialRequests.join(", ")}` : ""}

Generate a complete, playable game definition using scriptRef for all logic and input handling.`;

	if (intent.gameType === "match3") {
		basePrompt += `

IMPORTANT: This is a Match-3 game. You MUST:
1. Include a 'match3' configuration object with:
   - gridId: "main_grid"
   - rows: 4-12 (default 8)
   - cols: 4-12 (default 8)
   - cellSize: 0.8-1.5 (default 1.2)
   - piecePrefabs: array of 3-6 prefab IDs
   - minMatch: 3-5 (default 3)
2. Create 3-6 piece prefabs with:
   - tags: ["piece", "<color>"]
   - physics: { bodyType: "kinematic", isSensor: true }
   - scriptRef pointing to a piece script for visual feedback
3. Set world.gravity to { x: 0, y: 0 } (no gravity for match3)
4. Do NOT include matchDetection or scoring slots`;
	}

	if (intent.gameType === "tetris") {
		basePrompt += `

IMPORTANT: This is a Tetris game. You MUST:
1. Include a 'tetris' configuration object with:
   - gridId: "main_grid"
   - boardWidth: 10-20 (default 10)
   - boardHeight: 15-25 (default 20)
   - initialDropSpeed: 0.1-5 (default 1)
   - piecePrefabs: array of EXACTLY 7 prefab IDs (I, O, T, S, Z, J, L)
2. Create 7 piece prefabs with:
   - tags: ["piece", "<color>"]
   - physics: { bodyType: "kinematic", isSensor: true }
   - scriptRef pointing to a piece script for visual feedback
3. Set world.gravity to { x: 0, y: 0 } (Tetris handles its own gravity)
4. Do NOT include rotationRule, lineClearing, or pieceSpawner slots`;
	}

	if (intent.gameType === "3d") {
		basePrompt += `

IMPORTANT: This is a 3D game. You MUST:
1. Set sceneType: "3d" at the top level
2. Use a 3D world config with gravity: { x: 0, y: -9.8, z: 0 }
3. Include camera3d with an appropriate type (first-person, third-person, orbit, or fixed)
4. Use 3D transforms on all entities: { x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ }
5. Use 3D physics: { bodyType, collider: { type: "box" | "sphere" | "capsule", size: { x, y, z } } }
6. Use 3D visuals: { type: "primitive", primitive: "box" | "sphere" | "cylinder" | "capsule", color, size: { x, y, z } }
7. Include input3d with movement config for WASD/mouse controls
8. Create a player entity with bodyType: "kinematic" and a floor entity with bodyType: "static"
9. Units are in meters (1 unit = 1 meter). A character is about 1.8m tall, floors should be large (50x50 or more)
10. Y-axis is up. Ground level is y=0. Place entities above ground.
11. Do NOT include 2D-specific fields: pixelsPerMeter, camera (use camera3d), parallaxConfig
12. For voxel/minecraft games, create entities with visual type "primitive" primitive "box" - voxel batches are created at runtime via scripts`;
	}

	if (shouldIncludeEconomyGuidance(prompt, intent)) {
		basePrompt += ECONOMY_GUIDANCE;
	}

	return basePrompt;
}

function buildRefinementPrompt(
	currentGame: GameDefinition,
	request: string,
): string {
	return `Current Game:
Title: ${currentGame.metadata.title}
Description: ${currentGame.metadata.description}

Current Definition:
${JSON.stringify(currentGame, null, 2)}

User's modification request: "${request}"

Apply the requested changes and return the complete modified game definition.`;
}

export async function generateGame(
	prompt: string,
	config: AIConfig,
	options: GenerationOptions = {},
): Promise<GenerationResult> {
	const { maxRetries = 2, temperature = 0.7 } = options;

	const intent = classifyPrompt(prompt);

	if (!intent.gameType) {
		return {
			success: false,
			intent,
			error: {
				code: "INVALID_PROMPT",
				message: "Couldn't understand what kind of game you want",
				suggestions: [
					"Try being more specific about the gameplay",
					"Example: 'A game where I launch balls at targets'",
					"Example: 'A platformer where a cat collects fish'",
				],
			},
		};
	}

	const model = createModel({
		apiKey: config.apiKey,
		model: config.model ?? DEFAULT_MODEL,
	});

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const userPrompt = buildGenerationPrompt(prompt, intent);

			const result = await generateObject({
				model,
				schema: GameDefinitionSchema,
				system: SYSTEM_PROMPT,
				prompt: userPrompt,
				temperature: attempt === 0 ? temperature : temperature + 0.1,
			});

			const game = result.object as GameDefinition;

			if (!game.metadata?.id) {
				game.metadata = {
					...game.metadata,
					id: `game-${Date.now()}`,
				};
			}

			const validationResult = validateGameDefinition(game);

			if (!validationResult.valid) {
				if (attempt < maxRetries) {
					continue;
				}

				if (validationResult.errors.length <= 3) {
					return {
						success: true,
						game,
						intent,
						validationResult,
						retryCount: attempt,
					};
				}

				return {
					success: false,
					intent,
					validationResult,
					error: {
						code: "VALIDATION_FAILED" as const,
						message:
							"Generated game has too many validation errors. Please try a different prompt.",
						suggestions: ["Try being more specific about the gameplay"],
					},
					retryCount: attempt,
				};
			}

			return {
				success: true,
				game,
				intent,
				validationResult,
				retryCount: attempt,
			};
		} catch (err) {
			console.error(`Generation attempt ${attempt + 1} failed:`, err);

			if (attempt === maxRetries) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";

				if (
					errorMessage.includes("rate_limit") ||
					errorMessage.includes("429")
				) {
					return {
						success: false,
						intent,
						error: {
							code: "API_ERROR",
							message: "Too many requests. Please try again in a moment.",
							suggestions: ["Wait a few seconds and try again"],
						},
						retryCount: attempt,
					};
				}

				return {
					success: false,
					intent,
					error: {
						code: "GENERATION_FAILED" as const,
						message: `Generation failed after ${attempt + 1} attempts`,
						suggestions: [
							"Try again in a moment",
							"Try a different game description",
						],
					},
					retryCount: attempt,
				};
			}
		}
	}

	return {
		success: false,
		intent,
		error: {
			code: "GENERATION_FAILED" as const,
			message: "Generation failed after all retries",
			suggestions: ["Try again", "Try a simpler game description"],
		},
		retryCount: maxRetries,
	};
}

export async function refineGame(
	currentGame: GameDefinition,
	request: string,
	config: AIConfig,
): Promise<RefinementResult> {
	const model = createModel({
		apiKey: config.apiKey,
		model: config.model ?? DEFAULT_MODEL,
	});

	try {
		const userPrompt = buildRefinementPrompt(currentGame, request);

		const result = await generateObject({
			model,
			schema: GameDefinitionSchema,
			system: REFINEMENT_SYSTEM_PROMPT,
			prompt: userPrompt,
			temperature: 0.5,
		});

		const game = result.object as GameDefinition;

		if (!game.metadata?.id) {
			game.metadata = {
				...game.metadata,
				id: currentGame.metadata.id,
			};
		}

		const validationResult = validateGameDefinition(game);

		if (!validationResult.valid && validationResult.errors.length > 3) {
			return {
				success: false,
				game,
				validationResult,
				error: {
					code: "VALIDATION_FAILED",
					message: "Refined game has validation errors",
					suggestions: ["Try a different modification"],
				},
			};
		}

		return {
			success: true,
			game,
			validationResult,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Unknown error";

		return {
			success: false,
			error: {
				code: "API_ERROR",
				message: `API error: ${errorMessage}`,
				suggestions: ["Try again in a moment"],
			},
		};
	}
}

export function getAIConfigFromEnv(env: {
	AI_PROVIDER?: string;
	OPENROUTER_API_KEY?: string;
	AI_MODEL?: string;
}): AIConfig | null {
	const provider = (env.AI_PROVIDER ?? "openrouter") as AIProvider;

	if (provider !== "openrouter") {
		return null;
	}

	if (!env.OPENROUTER_API_KEY) {
		return null;
	}

	return {
		apiKey: env.OPENROUTER_API_KEY,
		model: env.AI_MODEL,
	};
}
