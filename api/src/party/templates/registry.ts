import type { PartyTemplateRunner } from "../PartyRoomDO";
import { runQuestionAnswer } from "./question-answer";
import { runQuiplash } from "./quiplash";

export const TEMPLATE_REGISTRY: Record<string, PartyTemplateRunner> = {
	quiplash: runQuiplash,
	"question-answer": runQuestionAnswer,
};
