import crowdComedyDefinition from "../../../../r2/games/crowd-comedy/definition.json";
import questionAnswerDefinition from "../../../../r2/games/question-answer/definition.json";
import quiplashDefinition from "../../../../r2/games/quiplash/definition.json";
import { type ContentType, loadContentPack } from "../content/prompt-loader";
import {
	type ServerScriptRoom,
	ServerScriptRunner,
} from "../ServerScriptRunner";

type PartyTemplateRunner = (room: ServerScriptRoom) => Promise<void>;

type QuiplashDefinition = {
	party?: {
		serverScript?: string;
		contentPacks?: ContentType[];
		roundCount?: number;
	};
	modules?: Record<string, string>;
};

const r2QuiplashDefinition = quiplashDefinition as QuiplashDefinition;
const r2CrowdComedyDefinition = crowdComedyDefinition as QuiplashDefinition;
const r2QuestionAnswerDefinition =
	questionAnswerDefinition as QuiplashDefinition;

const runFromDefinition =
	(templateName: string, definition: QuiplashDefinition): PartyTemplateRunner =>
	async (room) => {
		const serverScriptName = definition.party?.serverScript ?? "server";
		const scriptCode = definition.modules?.[serverScriptName];

		if (typeof scriptCode !== "string" || scriptCode.length === 0) {
			throw new Error(
				`${templateName} server script "${serverScriptName}" not found in definition`,
			);
		}

		const contentPackIds = definition.party?.contentPacks ?? [];
		const contentPack = contentPackIds.flatMap((packId) =>
			loadContentPack(packId),
		);

		const runner = new ServerScriptRunner(room);
		await runner.execute(scriptCode, {
			contentPack,
			roundCount: definition.party?.roundCount,
		});
	};

const runQuiplashFromDefinition = runFromDefinition(
	"Quiplash",
	r2QuiplashDefinition,
);
const runCrowdComedyFromDefinition = runFromDefinition(
	"Crowd Comedy",
	r2CrowdComedyDefinition,
);
const runQuestionAnswerFromDefinition = runFromDefinition(
	"Question Answer",
	r2QuestionAnswerDefinition,
);

export const TEMPLATE_REGISTRY: Record<string, PartyTemplateRunner> = {
	quiplash: runQuiplashFromDefinition,
	"question-answer": runQuestionAnswerFromDefinition,
	"crowd-comedy": runCrowdComedyFromDefinition,
};
