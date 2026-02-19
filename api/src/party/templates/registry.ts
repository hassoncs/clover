import aboutYouBluffDefinition from "../../../../r2/games/party/about-you-bluff/definition.json";
import chainReactionDefinition from "../../../../r2/games/party/chain-reaction/definition.json";
import chromaCluesDefinition from "../../../../r2/games/party/chroma-clues/definition.json";
import consensusMineDefinition from "../../../../r2/games/party/consensus-mine/definition.json";
import drawfulAnimateDefinition from "../../../../r2/games/party/drawful-animate/definition.json";
import halfAndHalfDefinition from "../../../../r2/games/party/half-and-half/definition.json";
import headsUpDefinition from "../../../../r2/games/party/headsUp/definition.json";
import lexiconLadderDefinition from "../../../../r2/games/party/lexicon-ladder/definition.json";
import percentPanicDefinition from "../../../../r2/games/party/percent-panic/definition.json";
import punchlineFerryDefinition from "../../../../r2/games/party/punchline-ferry/definition.json";
import quickfireQADefinition from "../../../../r2/games/party/quickfire-qa/definition.json";
import quiplashDefinition from "../../../../r2/games/party/quiplash/definition.json";
import rivalRosterDefinition from "../../../../r2/games/party/rival-roster/definition.json";
import roleReplayDefinition from "../../../../r2/games/party/role-replay/definition.json";
import ruinAndRedeemDefinition from "../../../../r2/games/party/ruin-and-redeem/definition.json";
import shirtClashDefinition from "../../../../r2/games/party/shirt-clash/definition.json";
import sketchBluffDefinition from "../../../../r2/games/party/sketch-bluff/definition.json";
import spectrumGuessDefinition from "../../../../r2/games/party/spectrum-guess/definition.json";
import truthTrapDefinition from "../../../../r2/games/party/truth-trap/definition.json";
import yearJinxDefinition from "../../../../r2/games/party/year-jinx/definition.json";
import {
	type ContentType,
	loadContentPackFromDB,
} from "../content/prompt-loader";
import {
	QuickJSServerRunner,
	type ServerScriptRoom,
} from "../QuickJSServerRunner";

type D1Database = import("@cloudflare/workers-types").D1Database;

type PartyTemplateRunner = (room: ServerScriptRoom) => Promise<void>;

type PartyGameDefinition = {
	party?: {
		serverScript?: string;
		contentPacks?: ContentType[];
		roundCount?: number;
	};
	modules?: Record<string, string>;
};

const r2AboutYouBluffDefinition =
	aboutYouBluffDefinition as PartyGameDefinition;
const r2ChainReactionDefinition =
	chainReactionDefinition as PartyGameDefinition;
const r2ConsensusMineDefinition =
	consensusMineDefinition as PartyGameDefinition;
const r2LexiconLadderDefinition =
	lexiconLadderDefinition as PartyGameDefinition;
const r2PartyGameDefinition = quiplashDefinition as PartyGameDefinition;
const r2HalfAndHalfDefinition = halfAndHalfDefinition as PartyGameDefinition;
const r2PercentPanicDefinition = percentPanicDefinition as PartyGameDefinition;
const r2QuickfireQADefinition = quickfireQADefinition as PartyGameDefinition;
const r2RoleReplayDefinition = roleReplayDefinition as PartyGameDefinition;
const r2RuinAndRedeemDefinition =
	ruinAndRedeemDefinition as PartyGameDefinition;
const r2SpectrumGuessDefinition =
	spectrumGuessDefinition as PartyGameDefinition;
const r2TruthTrapDefinition = truthTrapDefinition as PartyGameDefinition;
const r2YearJinxDefinition = yearJinxDefinition as PartyGameDefinition;
const r2PunchlineFerryDefinition =
	punchlineFerryDefinition as PartyGameDefinition;
const r2RivalRosterDefinition = rivalRosterDefinition as PartyGameDefinition;
const r2ShirtClashDefinition = shirtClashDefinition as PartyGameDefinition;
const r2SketchBluffDefinition = sketchBluffDefinition as PartyGameDefinition;
const r2ChromaCluesDefinition = chromaCluesDefinition as PartyGameDefinition;
const r2DrawfulAnimateDefinition =
	drawfulAnimateDefinition as PartyGameDefinition;
const r2HeadsUpDefinition = headsUpDefinition as PartyGameDefinition;

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

export const DEFINITION_BY_TEMPLATE_ID: Record<string, PartyGameDefinition> = {
	"about-you-bluff": r2AboutYouBluffDefinition,
	"chain-reaction": r2ChainReactionDefinition,
	"chroma-clues": r2ChromaCluesDefinition,
	"consensus-mine": r2ConsensusMineDefinition,
	"drawful-animate": r2DrawfulAnimateDefinition,
	"half-and-half": r2HalfAndHalfDefinition,
	"heads-up": r2HeadsUpDefinition,
	"lexicon-ladder": r2LexiconLadderDefinition,
	quiplash: r2PartyGameDefinition,
	"percent-panic": r2PercentPanicDefinition,
	"punchline-ferry": r2PunchlineFerryDefinition,
	"quickfire-qa": r2QuickfireQADefinition,
	"rival-roster": r2RivalRosterDefinition,
	"role-replay": r2RoleReplayDefinition,
	"ruin-and-redeem": r2RuinAndRedeemDefinition,
	"shirt-clash": r2ShirtClashDefinition,
	"sketch-bluff": r2SketchBluffDefinition,
	"spectrum-guess": r2SpectrumGuessDefinition,
	"truth-trap": r2TruthTrapDefinition,
	"year-jinx": r2YearJinxDefinition,
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

export function buildRunnerFromPreloadedContent(
	templateId: string,
	contentPack: unknown[],
): PartyTemplateRunner | null {
	const definition = DEFINITION_BY_TEMPLATE_ID[templateId];
	if (!definition) return null;
	const templateName = TEMPLATE_NAMES[templateId] ?? templateId;

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
