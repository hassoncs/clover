import { amenBrand } from "../../brands/amen.js";
import { composeGameTypeConfig, type GameTypeConfig } from "../prompts.js";

const AMEN_BASE_GAME_TYPES = [
	"trivia",
	"quip",
	"fibbage",
	"drawing",
	"history",
	"ranking",
	"dilemma",
	"headsup",
	"wager",
] as const;

export const AMEN_SYSTEM_PREFIX = amenBrand.voice.systemPrefix;

export const AMEN_GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> =
	Object.fromEntries(
		AMEN_BASE_GAME_TYPES.map((gameType) => [
			`amen-${gameType}`,
			composeGameTypeConfig("amen", gameType),
		]),
	);
