const DEFAULT_SCORING = {
    criticalPenalty: 30,
    warningPenalty: 3,
    minScore: 0,
    maxScore: 100,
};
const DEFAULT_TOP_ISSUES = {
    limit: 3,
    includeWarnings: true,
};
export function computeValidationScore(issues, options = {}) {
    const opts = { ...DEFAULT_SCORING, ...options };
    let criticalCount = 0;
    let warningCount = 0;
    for (const issue of issues) {
        if (issue.severity === 'critical') {
            criticalCount++;
        }
        else {
            warningCount++;
        }
    }
    const penalty = (criticalCount * opts.criticalPenalty) + (warningCount * opts.warningPenalty);
    const score = opts.maxScore - penalty;
    return Math.max(opts.minScore, Math.min(opts.maxScore, score));
}
export function selectTopIssues(issues, options = {}) {
    const opts = { ...DEFAULT_TOP_ISSUES, ...options };
    const sorted = [...issues].sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical')
            return -1;
        if (a.severity !== 'critical' && b.severity === 'critical')
            return 1;
        return a.path.localeCompare(b.path);
    });
    if (!opts.includeWarnings) {
        const criticalOnly = sorted.filter(i => i.severity === 'critical');
        return criticalOnly.slice(0, opts.limit);
    }
    return sorted.slice(0, opts.limit);
}
export function computeValidationSummary(issues, scoringOptions, topIssuesOptions) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    return {
        criticalCount,
        warningCount,
        score: computeValidationScore(issues, scoringOptions),
        topIssues: selectTopIssues(issues, topIssuesOptions),
    };
}
//# sourceMappingURL=scoring.js.map