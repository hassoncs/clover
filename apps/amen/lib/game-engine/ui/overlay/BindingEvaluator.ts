import { Parser } from "expr-eval";

// ============================================================================
// Types
// ============================================================================

export interface BindingContext {
	variables: Record<string, number | string | boolean>;
	state: string;
	elapsed: number;
	score: number;
	lives: number;
	role: string;
	room: Record<string, unknown>;
	entityCount: (tag: string) => number;
	formatTime: (seconds: number) => string;
	formatNumber: (n: number) => string;
	percent: (value: number, max: number) => string;
}

// ============================================================================
// Built-in Formatters
// ============================================================================

export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
	return n.toLocaleString("en-US");
}

export function percent(value: number, max: number): string {
	if (max === 0) return "0%";
	return `${Math.round((value / max) * 100)}%`;
}

// ============================================================================
// Context Builder
// ============================================================================

export function buildBindingContext(
	gameState: {
		time: number;
		state: string;
		variables: Record<string, number | string | boolean>;
	},
	getEntityCountByTag: (tag: string) => number,
): BindingContext {
	const role = (gameState.variables.role as string) ?? "";

	const room: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(gameState.variables)) {
		if (key.startsWith("room.")) {
			const roomKey = key.slice(5);
			room[roomKey] = value;
		}
	}

	return {
		variables: gameState.variables,
		state: gameState.state,
		elapsed: gameState.time,
		score: (gameState.variables.score as number) ?? 0,
		lives: (gameState.variables.lives as number) ?? 0,
		role,
		room,
		entityCount: getEntityCountByTag,
		formatTime,
		formatNumber,
		percent,
	};
}

// ============================================================================
// Expression Evaluator
// ============================================================================

const parser = new Parser({ allowMemberAccess: true });

export function evaluateExpression(expr: string, ctx: BindingContext): unknown {
	try {
		const parsed = parser.parse(expr);
		return parsed.evaluate(ctx as unknown as Record<string, number>);
	} catch {
		return undefined;
	}
}

export function evaluateCondition(expr: string, ctx: BindingContext): boolean {
	try {
		const parsed = parser.parse(expr);
		return Boolean(parsed.evaluate(ctx as unknown as Record<string, number>));
	} catch {
		return false;
	}
}

export function evaluateTemplate(
	template: string,
	ctx: BindingContext,
): string {
	return template.replace(/\{\{(.+?)\}\}/g, (_match, expr: string) => {
		try {
			const parsed = parser.parse(expr.trim());
			const result = parsed.evaluate(ctx as unknown as Record<string, number>);
			return String(result);
		} catch {
			return "??";
		}
	});
}

export function resolveBinding(
	key: string,
	expression: string,
	ctx: BindingContext,
): unknown {
	if (key === "text") {
		return evaluateTemplate(expression, ctx);
	}
	return evaluateExpression(expression, ctx);
}
