import type { PartyTemplateRunner } from "../PartyRoomDO";
import { runCrowdComedy } from "./crowd-comedy";
import { runQuestionAnswer } from "./question-answer";
import { runQuiplash } from "./quiplash";

export const TEMPLATE_REGISTRY: Record<string, PartyTemplateRunner> = {
	quiplash: runQuiplash,
	"question-answer": runQuestionAnswer,
	"crowd-comedy": runCrowdComedy,
};
