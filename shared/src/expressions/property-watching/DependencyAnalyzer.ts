import type { Behavior } from "../../types/behavior";
import type { EntityPrefab } from "../../types/entity";
import type { GameDefinition } from "../../types/GameDefinition";
import { Parser } from "../parser";
import type { ASTNode, ExpressionValue } from "../types";
import { PropertyRegistry } from "./PropertyRegistry";
import type {
	AnalysisContext,
	DependencyGraph,
	PropertyPath,
	PropertyWatchSpec,
	ValidationIssue,
	ValidationReport,
	ValidationStats,
	WatchScope,
} from "./types";

export class DependencyAnalyzer {
	private game: GameDefinition;
	private issues: ValidationIssue[] = [];
	private watches: PropertyWatchSpec[] = [];
	private dependencyGraph: DependencyGraph = {};
	private expressionCount = 0;

	constructor(game: GameDefinition) {
		this.game = game;
	}

	analyze(): ValidationReport {
		this.issues = [];
		this.watches = [];
		this.dependencyGraph = {};
		this.expressionCount = 0;

		this.analyzePrefabs();
		this.analyzeEntities();
		this.analyzeRules();

		const stats = this.computeStats();

		return {
			valid: this.issues.filter((i) => i.severity === "error").length === 0,
			errors: this.issues.filter((i) => i.severity === "error"),
			warnings: this.issues.filter((i) => i.severity === "warning"),
			stats,
			dependencyGraph: this.dependencyGraph,
			timestamp: Date.now(),
		};
	}

	getWatchSpecs(): PropertyWatchSpec[] {
		return this.watches;
	}

	private analyzePrefabs(): void {
		for (const [prefabId, prefab] of Object.entries(this.game.prefabs)) {
			this.analyzePrefab(prefabId, prefab as EntityPrefab);
		}
	}

	private analyzePrefab(prefabId: string, prefab: EntityPrefab): void {
		if (!prefab.behaviors) return;

		for (let i = 0; i < prefab.behaviors.length; i++) {
			const behavior = prefab.behaviors[i];
			this.analyzeBehavior(behavior, {
				hasSelfContext: true,
				contextTags: prefab.tags,
				debugName: `Prefab[${prefabId}].Behavior[${i}:${behavior.type}]`,
				behaviorType: behavior.type,
			});
		}
	}

	private analyzeEntities(): void {
		for (const entity of this.game.entities) {
			if (!entity.behaviors) continue;

			for (let i = 0; i < entity.behaviors.length; i++) {
				const behavior = entity.behaviors[i];
				this.analyzeBehavior(behavior, {
					hasSelfContext: true,
					contextTags: entity.tags,
					debugName: `Entity[${entity.id}].Behavior[${i}:${behavior.type}]`,
					entityId: entity.id,
					behaviorType: behavior.type,
				});
			}
		}
	}

	private analyzeBehavior(behavior: Behavior, context: AnalysisContext): void {
		switch (behavior.type) {
			case "maintain_speed":
				this.analyzeValue(behavior.speed, {
					...context,
					debugName: `${context.debugName}.speed`,
				});
				break;

			case "score_on_collision":
				this.analyzeValue(behavior.points, {
					...context,
					debugName: `${context.debugName}.points`,
				});
				break;

			case "score_on_destroy":
				this.analyzeValue(behavior.points, {
					...context,
					debugName: `${context.debugName}.points`,
				});
				break;
		}
	}

	private analyzeRules(): void {
		// Rules removed from GameDefinition — no-op
	}

	private analyzeValue<T>(
		value: T | ExpressionValue,
		context: AnalysisContext,
	): void {
		if (this.isExpressionValue(value)) {
			this.analyzeExpression(value.expr, context);
		}
	}

	private isExpressionValue(value: unknown): value is ExpressionValue {
		return (
			typeof value === "object" &&
			value !== null &&
			"expr" in value &&
			typeof (value as ExpressionValue).expr === "string"
		);
	}

	private analyzeExpression(expr: string, context: AnalysisContext): void {
		this.expressionCount++;

		try {
			const parser = new Parser(expr);
			const ast = parser.parse();
			this.walkAST(ast, context);
		} catch (error) {
			this.addIssue({
				severity: "error",
				code: "INVALID_EXPRESSION",
				message:
					error instanceof Error ? error.message : "Failed to parse expression",
				location: {
					expression: expr,
					...this.contextToLocation(context),
				},
			});
		}
	}

	private walkAST(node: ASTNode, context: AnalysisContext): void {
		switch (node.type) {
			case "MemberAccess":
				this.handleMemberAccess(node, context);
				break;

			case "BinaryOp":
				this.walkAST(node.left, context);
				this.walkAST(node.right, context);
				break;

			case "UnaryOp":
				this.walkAST(node.operand, context);
				break;

			case "Ternary":
				this.walkAST(node.condition, context);
				this.walkAST(node.consequent, context);
				this.walkAST(node.alternate, context);
				break;

			case "FunctionCall":
				for (const arg of node.args) {
					this.walkAST(arg, context);
				}
				break;

			case "VectorLiteral":
				this.walkAST(node.x, context);
				this.walkAST(node.y, context);
				break;

			case "TemplateString":
				for (const part of node.parts) {
					if (part.type === "expr") {
						this.walkAST(part.node, context);
					}
				}
				break;
		}
	}

	private handleMemberAccess(
		node: ASTNode & { type: "MemberAccess" },
		context: AnalysisContext,
	): void {
		this.walkAST(node.object, context);

		const path = this.extractPropertyPath(node);
		if (!path) return;

		let metadata: import("./types").PropertyMetadata;

		if (!PropertyRegistry.isKnownProperty(path)) {
			this.addIssue({
				severity: "warning",
				code: "UNKNOWN_PROPERTY",
				message: `Property '${path}' is not in the property registry (using inferred metadata)`,
				location: {
					expression: path,
					...this.contextToLocation(context),
				},
				suggestion: `Property '${path}' will be synced with inferred metadata. Register it explicitly for better control.`,
			});
			metadata = PropertyRegistry.getMetadataOrInfer(path);
		} else {
			const knownMetadata = PropertyRegistry.getMetadata(path);
			if (!knownMetadata) return;
			metadata = knownMetadata;
		}

		const scope = this.determineWatchScope(node, context);

		this.watches.push({
			property: path,
			scope,
			frequency: metadata.frequency,
			debugName: context.debugName,
		});

		if (context.entityId) {
			if (!this.dependencyGraph[context.entityId]) {
				this.dependencyGraph[context.entityId] = {
					needs: [],
					behaviors: [],
					usedByRules: [],
				};
			}

			const deps = this.dependencyGraph[context.entityId];
			if (!deps.needs.includes(path)) {
				deps.needs.push(path);
			}
			if (
				context.behaviorType &&
				!deps.behaviors.includes(context.behaviorType)
			) {
				deps.behaviors.push(context.behaviorType);
			}
			if (context.ruleId && !deps.usedByRules.includes(context.ruleId)) {
				deps.usedByRules.push(context.ruleId);
			}
		}
	}

	private extractPropertyPath(
		node: ASTNode & { type: "MemberAccess" },
	): PropertyPath | null {
		const parts: string[] = [];
		let current: ASTNode = node;

		while (current.type === "MemberAccess") {
			parts.unshift(current.property);
			current = current.object;
		}

		if (current.type === "Identifier") {
			if (current.name === "self") {
				return parts.join(".");
			}
		}

		return null;
	}

	private determineWatchScope(
		node: ASTNode & { type: "MemberAccess" },
		context: AnalysisContext,
	): WatchScope {
		let current: ASTNode = node;
		while (current.type === "MemberAccess") {
			current = current.object;
		}

		if (current.type === "Identifier" && current.name === "self") {
			if (context.hasSelfContext) {
				return { type: "self" };
			} else {
				return { type: "all" };
			}
		}

		return { type: "all" };
	}

	private addIssue(issue: ValidationIssue): void {
		this.issues.push(issue);
	}

	private contextToLocation(context: AnalysisContext): {
		entity?: string;
		behavior?: string;
		behaviorType?: string;
		rule?: string;
	} {
		return {
			entity: context.entityId,
			behavior: context.debugName,
			behaviorType: context.behaviorType,
			rule: context.ruleId,
		};
	}

	private computeStats(): ValidationStats {
		const uniqueProperties = new Set(this.watches.map((w) => w.property));
		const entitiesAffected = Object.keys(this.dependencyGraph).length;

		const bytesPerProperty = 8;
		const avgPropertiesPerEntity =
			entitiesAffected > 0 ? uniqueProperties.size / entitiesAffected : 0;
		const estimatedBytesPerFrame =
			entitiesAffected * avgPropertiesPerEntity * bytesPerProperty;

		return {
			totalExpressions: this.expressionCount,
			totalBehaviors: this.countBehaviors(),
			totalRules: 0,
			totalEntities: this.game.entities.length,
			propertiesWatched: Array.from(uniqueProperties),
			entitiesAffected,
			estimatedBandwidth: `${(estimatedBytesPerFrame / 1024).toFixed(2)} KB/frame`,
			estimatedCPU: "~0.1 ms/frame",
		};
	}

	private countBehaviors(): number {
		let count = 0;

		for (const prefab of Object.values(this.game.prefabs)) {
			count += prefab.behaviors?.length ?? 0;
		}

		for (const entity of this.game.entities) {
			count += entity.behaviors?.length ?? 0;
		}

		return count;
	}
}
