import { validateExpression } from "@slopcade/shared/expressions/validator";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import {
	CURRENT_VALIDATOR_VERSION,
	type GameValidationIssue,
	type GameValidationReport,
	mapLegacyResultToReport,
	validateGameDefinition,
} from "@slopcade/shared/validation";

interface ExpressionLocation {
	ruleId: string;
	path: string;
	expression: string;
}

function extractExpressions(_game: GameDefinition): ExpressionLocation[] {
	return [];
}

function validateGameExpressions(game: GameDefinition): GameValidationIssue[] {
	const issues: GameValidationIssue[] = [];
	const knownVariableNames = game.variables ? Object.keys(game.variables) : [];
	const expressions = extractExpressions(game);

	for (const { expression, path } of expressions) {
		const result = validateExpression(expression, {
			knownVariables: knownVariableNames,
			path,
		});

		if (!result.valid) {
			for (const error of result.errors) {
				issues.push({
					code: "EXPRESSION_ERROR",
					message: error.message,
					severity: "critical",
					source: "expressions",
					path,
					context: expression,
				});
			}
		}
	}

	return issues;
}

export function validateGame(game: GameDefinition): GameValidationReport {
	const structureResult = validateGameDefinition(game);
	const structureReport = mapLegacyResultToReport(
		structureResult,
		"gameDefinition",
	);
	const expressionIssues = validateGameExpressions(game);

	const combinedIssues: GameValidationIssue[] = [
		...structureReport.issues,
		...expressionIssues,
	];

	const criticalCount = combinedIssues.filter(
		(i) => i.severity === "critical",
	).length;
	const warningCount = combinedIssues.filter(
		(i) => i.severity === "warning",
	).length;

	const topIssues = [...combinedIssues]
		.sort((a, b) => {
			if (a.severity === "critical" && b.severity !== "critical") return -1;
			if (a.severity !== "critical" && b.severity === "critical") return 1;
			return a.path.localeCompare(b.path);
		})
		.slice(0, 3);

	const score = Math.max(
		0,
		Math.min(100, 100 - criticalCount * 30 - warningCount * 3),
	);

	return {
		valid: criticalCount === 0,
		issues: combinedIssues,
		summary: {
			criticalCount,
			warningCount,
			score,
			topIssues,
		},
		validatorVersion: CURRENT_VALIDATOR_VERSION,
		validatedAt: Date.now(),
	};
}

export function getValidationReportJson(report: GameValidationReport): string {
	return JSON.stringify(report);
}
