import type { ContentType } from "@slopcade/shared/schema/party-content";
import { loadContentPackFromDB } from "../content/prompt-loader";
import {
	QuickJSServerRunner,
	type ServerScriptRoom,
} from "../QuickJSServerRunner";
import {
	DEFINITION_BY_TEMPLATE_ID,
	type PartyGameDefinition,
} from "./registry-definitions";

export { DEFINITION_BY_TEMPLATE_ID } from "./registry-definitions";

type D1Database = import("@cloudflare/workers-types").D1Database;

type PartyTemplateRunner = (room: ServerScriptRoom) => Promise<void>;

const r2AboutYouBluffDefinition = DEFINITION_BY_TEMPLATE_ID["about-you-bluff"];
const r2ChainReactionDefinition = DEFINITION_BY_TEMPLATE_ID["chain-reaction"];
const r2ChromaCluesDefinition = DEFINITION_BY_TEMPLATE_ID["chroma-clues"];
const r2ConsensusMineDefinition = DEFINITION_BY_TEMPLATE_ID["consensus-mine"];
const r2DrawfulAnimateDefinition = DEFINITION_BY_TEMPLATE_ID["drawful-animate"];
const r2HalfAndHalfDefinition = DEFINITION_BY_TEMPLATE_ID["half-and-half"];
const r2HeadsUpDefinition = DEFINITION_BY_TEMPLATE_ID["heads-up"];
const r2LexiconLadderDefinition = DEFINITION_BY_TEMPLATE_ID["lexicon-ladder"];
const r2PartyGameDefinition = DEFINITION_BY_TEMPLATE_ID.quiplash;
const r2PercentPanicDefinition = DEFINITION_BY_TEMPLATE_ID["percent-panic"];
const r2PunchlineFerryDefinition = DEFINITION_BY_TEMPLATE_ID["punchline-ferry"];
const r2QuickfireQADefinition = DEFINITION_BY_TEMPLATE_ID["quickfire-qa"];
const r2RivalRosterDefinition = DEFINITION_BY_TEMPLATE_ID["rival-roster"];
const r2RoleReplayDefinition = DEFINITION_BY_TEMPLATE_ID["role-replay"];
const r2RuinAndRedeemDefinition = DEFINITION_BY_TEMPLATE_ID["ruin-and-redeem"];
const r2ShirtClashDefinition = DEFINITION_BY_TEMPLATE_ID["shirt-clash"];
const r2SketchBluffDefinition = DEFINITION_BY_TEMPLATE_ID["sketch-bluff"];
const r2SpectrumGuessDefinition = DEFINITION_BY_TEMPLATE_ID["spectrum-guess"];
const r2TruthTrapDefinition = DEFINITION_BY_TEMPLATE_ID["truth-trap"];
const r2YearJinxDefinition = DEFINITION_BY_TEMPLATE_ID["year-jinx"];

const runFromDefinition =
	(
		templateName: string,
		definition: PartyGameDefinition,
		db: D1Database,
		brandId: string,
	): PartyTemplateRunner =>
	async (room) => {
		const serverScriptName = definition.party?.serverScript ?? "server";
		const scriptCode = definition.modules?.[serverScriptName];

		if (typeof scriptCode !== "string" || scriptCode.length === 0) {
			throw new Error(
				`${templateName} server script "${serverScriptName}" not found in definition`,
			);
		}

		const contentPackIds = definition.party?.contentPacks ?? [];
		const contentPackGroups = await Promise.all(
			contentPackIds.map((packId) =>
				loadContentPackFromDB(packId as ContentType, brandId, db),
			),
		);
		const contentPack = contentPackGroups.flat();

		const runner = new QuickJSServerRunner(room);
		await runner.execute(scriptCode, {
			contentPack,
			roundCount: definition.party?.roundCount,
		});
	};

const TEMPLATE_NAMES: Record<string, string> = {
	"about-you-bluff": "About You Bluff",
	"chain-reaction": "Chain Reaction",
	"chroma-clues": "Chroma Clues",
	"consensus-mine": "Consensus Mine",
	"drawful-animate": "Flicker Frames",
	"half-and-half": "Half and Half",
	"heads-up": "Heads Up",
	"lexicon-ladder": "Lexicon Ladder",
	quiplash: "Quiplash",
	"percent-panic": "Percent Panic",
	"punchline-ferry": "Guffaw Galleon",
	"quickfire-qa": "Quickfire Q&A",
	"rival-roster": "Rival Roster",
	"role-replay": "Role Replay",
	"ruin-and-redeem": "Ruin and Redeem",
	"shirt-clash": "Shirt Clash",
	"sketch-bluff": "Sketch Bluff",
	"spectrum-guess": "The Calibration Lab",
	"truth-trap": "Truth Trap",
	"year-jinx": "Year Jinx",
};

function resolveTemplateId(templateId: string): string {
	return templateId.replace(/^s-/, "");
}

export function buildRunnerFromPreloadedContent(
	templateId: string,
	contentPack: unknown[],
): PartyTemplateRunner | null {
	const baseId = resolveTemplateId(templateId);
	const definition = DEFINITION_BY_TEMPLATE_ID[baseId];
	if (!definition) return null;
	const templateName = TEMPLATE_NAMES[baseId] ?? templateId;

	return async (room) => {
		const serverScriptName = definition.party?.serverScript ?? "server";
		const scriptCode = definition.modules?.[serverScriptName];

		if (typeof scriptCode !== "string" || scriptCode.length === 0) {
			throw new Error(
				`${templateName} server script "${serverScriptName}" not found in definition`,
			);
		}

		const runner = new QuickJSServerRunner(room);
		await runner.execute(scriptCode, {
			contentPack,
			roundCount: definition.party?.roundCount,
		});
	};
}

export function buildTemplateRegistry(
	db: D1Database,
	brandId: string,
): Record<string, PartyTemplateRunner> {
	return {
		"about-you-bluff": runFromDefinition(
			"About You Bluff",
			r2AboutYouBluffDefinition,
			db,
			brandId,
		),
		"chain-reaction": runFromDefinition(
			"Chain Reaction",
			r2ChainReactionDefinition,
			db,
			brandId,
		),
		"chroma-clues": runFromDefinition(
			"Chroma Clues",
			r2ChromaCluesDefinition,
			db,
			brandId,
		),
		"consensus-mine": runFromDefinition(
			"Consensus Mine",
			r2ConsensusMineDefinition,
			db,
			brandId,
		),
		"drawful-animate": runFromDefinition(
			"Flicker Frames",
			r2DrawfulAnimateDefinition,
			db,
			brandId,
		),
		"half-and-half": runFromDefinition(
			"Half and Half",
			r2HalfAndHalfDefinition,
			db,
			brandId,
		),
		"heads-up": runFromDefinition("Heads Up", r2HeadsUpDefinition, db, brandId),
		"lexicon-ladder": runFromDefinition(
			"Lexicon Ladder",
			r2LexiconLadderDefinition,
			db,
			brandId,
		),
		quiplash: runFromDefinition("Quiplash", r2PartyGameDefinition, db, brandId),
		"percent-panic": runFromDefinition(
			"Percent Panic",
			r2PercentPanicDefinition,
			db,
			brandId,
		),
		"punchline-ferry": runFromDefinition(
			"Guffaw Galleon",
			r2PunchlineFerryDefinition,
			db,
			brandId,
		),
		"quickfire-qa": runFromDefinition(
			"Quickfire Q&A",
			r2QuickfireQADefinition,
			db,
			brandId,
		),
		"rival-roster": runFromDefinition(
			"Rival Roster",
			r2RivalRosterDefinition,
			db,
			brandId,
		),
		"role-replay": runFromDefinition(
			"Role Replay",
			r2RoleReplayDefinition,
			db,
			brandId,
		),
		"ruin-and-redeem": runFromDefinition(
			"Ruin and Redeem",
			r2RuinAndRedeemDefinition,
			db,
			brandId,
		),
		"shirt-clash": runFromDefinition(
			"Shirt Clash",
			r2ShirtClashDefinition,
			db,
			brandId,
		),
		"sketch-bluff": runFromDefinition(
			"Sketch Bluff",
			r2SketchBluffDefinition,
			db,
			brandId,
		),
		"spectrum-guess": runFromDefinition(
			"The Calibration Lab",
			r2SpectrumGuessDefinition,
			db,
			brandId,
		),
		"truth-trap": runFromDefinition(
			"Truth Trap",
			r2TruthTrapDefinition,
			db,
			brandId,
		),
		"year-jinx": runFromDefinition(
			"Year Jinx",
			r2YearJinxDefinition,
			db,
			brandId,
		),
	};
}
