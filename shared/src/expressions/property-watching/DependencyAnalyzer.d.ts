import type { GameDefinition } from "../../types/GameDefinition";
import type { PropertyWatchSpec, ValidationReport } from "./types";
export declare class DependencyAnalyzer {
    private game;
    private issues;
    private watches;
    private dependencyGraph;
    private expressionCount;
    constructor(game: GameDefinition);
    analyze(): ValidationReport;
    getWatchSpecs(): PropertyWatchSpec[];
    private analyzePrefabs;
    private analyzeEntities;
    private analyzeRules;
    private analyzeValue;
    private isExpressionValue;
    private analyzeExpression;
    private walkAST;
    private handleMemberAccess;
    private extractPropertyPath;
    private determineWatchScope;
    private addIssue;
    private contextToLocation;
    private computeStats;
    private countBehaviors;
}
//# sourceMappingURL=DependencyAnalyzer.d.ts.map