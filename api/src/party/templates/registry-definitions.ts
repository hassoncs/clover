import type { ContentType } from "@slopcade/shared/schema/party-content";
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

export type PartyGameDefinition = {
	party?: {
		serverScript?: string;
		contentPacks?: ContentType[];
		roundCount?: number;
	};
	modules?: Record<string, string>;
};

const BASE_DEFINITIONS: Record<string, PartyGameDefinition> = {
	"about-you-bluff": aboutYouBluffDefinition as PartyGameDefinition,
	"chain-reaction": chainReactionDefinition as PartyGameDefinition,
	"chroma-clues": chromaCluesDefinition as PartyGameDefinition,
	"consensus-mine": consensusMineDefinition as PartyGameDefinition,
	"drawful-animate": drawfulAnimateDefinition as PartyGameDefinition,
	"half-and-half": halfAndHalfDefinition as PartyGameDefinition,
	"heads-up": headsUpDefinition as PartyGameDefinition,
	"lexicon-ladder": lexiconLadderDefinition as PartyGameDefinition,
	quiplash: quiplashDefinition as PartyGameDefinition,
	"percent-panic": percentPanicDefinition as PartyGameDefinition,
	"punchline-ferry": punchlineFerryDefinition as PartyGameDefinition,
	"quickfire-qa": quickfireQADefinition as PartyGameDefinition,
	"rival-roster": rivalRosterDefinition as PartyGameDefinition,
	"role-replay": roleReplayDefinition as PartyGameDefinition,
	"ruin-and-redeem": ruinAndRedeemDefinition as PartyGameDefinition,
	"shirt-clash": shirtClashDefinition as PartyGameDefinition,
	"sketch-bluff": sketchBluffDefinition as PartyGameDefinition,
	"spectrum-guess": spectrumGuessDefinition as PartyGameDefinition,
	"truth-trap": truthTrapDefinition as PartyGameDefinition,
	"year-jinx": yearJinxDefinition as PartyGameDefinition,
};

export const DEFINITION_BY_TEMPLATE_ID: Record<string, PartyGameDefinition> =
	new Proxy(BASE_DEFINITIONS, {
		get(target, prop: string) {
			return target[prop] ?? target[prop.replace(/^s-/, "")];
		},
	});
