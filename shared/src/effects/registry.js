// ---------------------------------------------------------------------------
// Registry implementation
// ---------------------------------------------------------------------------
export class ManifestRegistry {
    nodes = new Map();
    aliasMap = new Map();
    register(registration) {
        this.nodes.set(registration.type, registration);
        for (const alias of registration.aiHints.aliases) {
            this.aliasMap.set(alias.toLowerCase(), registration.type);
        }
    }
    unregister(type) {
        const existing = this.nodes.get(type);
        if (!existing)
            return false;
        for (const alias of existing.aiHints.aliases) {
            this.aliasMap.delete(alias.toLowerCase());
        }
        this.nodes.delete(type);
        return true;
    }
    get(type) {
        return this.nodes.get(type);
    }
    has(type) {
        return this.nodes.has(type);
    }
    getAll() {
        return [...this.nodes.values()].sort((a, b) => a.type.localeCompare(b.type));
    }
    search(query) {
        const textLower = query.text?.toLowerCase();
        const results = [];
        for (const reg of this.nodes.values()) {
            if (query.tags && !query.tags.some((t) => reg.tags.includes(t)))
                continue;
            if (query.family && reg.family !== query.family)
                continue;
            if (query.performanceTier && reg.performanceTier !== query.performanceTier)
                continue;
            let score = 1;
            if (textLower) {
                const textScore = this.computeTextScore(reg, textLower);
                if (textScore === 0)
                    continue;
                score += textScore;
            }
            if (query.tags) {
                score += query.tags.filter((t) => reg.tags.includes(t)).length;
            }
            results.push({ registration: reg, relevanceScore: score });
        }
        results.sort((a, b) => {
            const scoreDiff = b.relevanceScore - a.relevanceScore;
            if (scoreDiff !== 0)
                return scoreDiff;
            return a.registration.type.localeCompare(b.registration.type);
        });
        return results;
    }
    resolveAlias(alias) {
        return this.aliasMap.get(alias.toLowerCase());
    }
    getAIContext(types) {
        const lines = [];
        for (const type of types) {
            const reg = this.nodes.get(type);
            if (!reg)
                continue;
            lines.push(`[${reg.type}] ${reg.displayName}`);
            lines.push(`  ${reg.aiHints.promptDescription}`);
            lines.push(`  Family: ${reg.family} | Perf: ${reg.performanceTier}`);
            if (reg.aiHints.aliases.length > 0) {
                lines.push(`  Aliases: ${reg.aiHints.aliases.join(', ')}`);
            }
            if (reg.aiHints.commonCombinations.length > 0) {
                lines.push(`  Combines with: ${reg.aiHints.commonCombinations.join(', ')}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    validateConstraints(nodeTypes) {
        const errors = [];
        const typeSet = new Set(nodeTypes);
        for (const type of nodeTypes) {
            const reg = this.nodes.get(type);
            if (!reg) {
                errors.push(`Unknown node type: ${type}`);
                continue;
            }
            if (reg.constraints.requires) {
                for (const req of reg.constraints.requires) {
                    if (!typeSet.has(req)) {
                        errors.push(`"${type}" requires "${req}" but it is missing`);
                    }
                }
            }
            if (reg.constraints.conflicts) {
                for (const conflict of reg.constraints.conflicts) {
                    if (typeSet.has(conflict)) {
                        errors.push(`"${type}" conflicts with "${conflict}"`);
                    }
                }
            }
        }
        return { valid: errors.length === 0, errors };
    }
    computeTextScore(reg, textLower) {
        let score = 0;
        for (const alias of reg.aiHints.aliases) {
            if (alias.toLowerCase() === textLower) {
                score += 10;
            }
            else if (alias.toLowerCase().includes(textLower)) {
                score += 5;
            }
        }
        if (reg.displayName.toLowerCase().includes(textLower)) {
            score += 4;
        }
        if (reg.description.toLowerCase().includes(textLower)) {
            score += 2;
        }
        for (const tag of reg.tags) {
            if (tag.toLowerCase().includes(textLower)) {
                score += 1;
            }
        }
        return score;
    }
}
export function convertRegistrationParamsToEffectParamSchema(reg) {
    return reg.paramsSchema.map((param) => ({
        key: param.name,
        uniformName: `u_${param.name}`,
        type: param.type,
        defaultValue: param.defaultValue,
        ui: {
            displayName: param.name,
            min: param.range?.min,
            max: param.range?.max,
        },
    }));
}
//# sourceMappingURL=registry.js.map