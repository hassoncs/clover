import aboutYouBluffDefinition from "../../../../r2/games/party/about-you-bluff/definition.json";
import chainReactionDefinition from "../../../../r2/games/party/chain-reaction/definition.json";
import chromaCluesDefinition from "../../../../r2/games/party/chroma-clues/definition.json";
import consensusMineDefinition from "../../../../r2/games/party/consensus-mine/definition.json";
import drawfulAnimateDefinition from "../../../../r2/games/party/drawful-animate/definition.json";
import halfAndHalfDefinition from "../../../../r2/games/party/half-and-half/definition.json";
import headsUpDefinition from "../../../../r2/games/party/headsUp/definition.json";
import lexiconLadderDefinition from "../../../../r2/games/party/lexicon-ladder/definition.json";
import outOfContextDefinition from "../../../../r2/games/party/out-of-context/definition.json";
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
import { type ContentType, loadContentPack } from "../content/prompt-loader";
import {
	QuickJSServerRunner,
	type ServerScriptRoom,
} from "../QuickJSServerRunner";

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
const r2OutOfContextDefinition = outOfContextDefinition as PartyGameDefinition;
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
			contentPackIds.map((packId) => loadContentPack(packId)),
		);
		const contentPack = contentPackGroups.flat();

		const runner = new QuickJSServerRunner(room);
		await runner.execute(scriptCode, {
			contentPack,
			roundCount: definition.party?.roundCount,
		});
	};

const runAboutYouBluffFromDefinition = runFromDefinition(
	"About You Bluff",
	r2AboutYouBluffDefinition,
);
const runChainReactionFromDefinition = runFromDefinition(
	"Chain Reaction",
	r2ChainReactionDefinition,
);
const runConsensusMineFromDefinition = runFromDefinition(
	"Consensus Mine",
	r2ConsensusMineDefinition,
);
const runLexiconLadderFromDefinition = runFromDefinition(
	"Lexicon Ladder",
	r2LexiconLadderDefinition,
);
const runQuiplashFromDefinition = runFromDefinition(
	"Quiplash",
	r2PartyGameDefinition,
);
const runHalfAndHalfFromDefinition = runFromDefinition(
	"Half and Half",
	r2HalfAndHalfDefinition,
);
const runOutOfContextFromDefinition = runFromDefinition(
	"Out of Context",
	r2OutOfContextDefinition,
);
const runPercentPanicFromDefinition = runFromDefinition(
	"Percent Panic",
	r2PercentPanicDefinition,
);
const runQuickfireQAFromDefinition = runFromDefinition(
	"Quickfire Q&A",
	r2QuickfireQADefinition,
);
const runRoleReplayFromDefinition = runFromDefinition(
	"Role Replay",
	r2RoleReplayDefinition,
);
const runRuinAndRedeemFromDefinition = runFromDefinition(
	"Ruin and Redeem",
	r2RuinAndRedeemDefinition,
);
const runSpectrumGuessFromDefinition = runFromDefinition(
	"The Calibration Lab",
	r2SpectrumGuessDefinition,
);
const runTruthTrapFromDefinition = runFromDefinition(
	"Truth Trap",
	r2TruthTrapDefinition,
);
const runYearJinxFromDefinition = runFromDefinition(
	"Year Jinx",
	r2YearJinxDefinition,
);
const runRivalRosterFromDefinition = runFromDefinition(
	"Rival Roster",
	r2RivalRosterDefinition,
);
const runShirtClashFromDefinition = runFromDefinition(
	"Shirt Clash",
	r2ShirtClashDefinition,
);
const runSketchBluffFromDefinition = runFromDefinition(
	"Sketch Bluff",
	r2SketchBluffDefinition,
);
const runChromaCluesFromDefinition = runFromDefinition(
	"Chroma Clues",
	r2ChromaCluesDefinition,
);
const runDrawfulAnimateFromDefinition = runFromDefinition(
	"Flicker Frames",
	r2DrawfulAnimateDefinition,
);
const runHeadsUpFromDefinition = runFromDefinition(
	"Heads Up",
	r2HeadsUpDefinition,
);
const runPunchlineFerryFromDefinition = runFromDefinition(
	"Guffaw Galleon",
	r2PunchlineFerryDefinition,
);

export const TEMPLATE_REGISTRY: Record<string, PartyTemplateRunner> = {
	"about-you-bluff": runAboutYouBluffFromDefinition,
	"chain-reaction": runChainReactionFromDefinition,
	"chroma-clues": runChromaCluesFromDefinition,
	"consensus-mine": runConsensusMineFromDefinition,
	"drawful-animate": runDrawfulAnimateFromDefinition,
	"half-and-half": runHalfAndHalfFromDefinition,
	"heads-up": runHeadsUpFromDefinition,
	"lexicon-ladder": runLexiconLadderFromDefinition,
	quiplash: runQuiplashFromDefinition,
	"out-of-context": runOutOfContextFromDefinition,
	"percent-panic": runPercentPanicFromDefinition,
	"punchline-ferry": runPunchlineFerryFromDefinition,
	"quickfire-qa": runQuickfireQAFromDefinition,
	"rival-roster": runRivalRosterFromDefinition,
	"role-replay": runRoleReplayFromDefinition,
	"ruin-and-redeem": runRuinAndRedeemFromDefinition,
	"shirt-clash": runShirtClashFromDefinition,
	"sketch-bluff": runSketchBluffFromDefinition,
	"spectrum-guess": runSpectrumGuessFromDefinition,
	"truth-trap": runTruthTrapFromDefinition,
	"year-jinx": runYearJinxFromDefinition,
};
