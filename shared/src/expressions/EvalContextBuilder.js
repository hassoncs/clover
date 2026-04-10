import { compile } from './evaluator';
import { isExpression, } from './types';
import { getValue } from '../types/GameDefinition';
export class CyclicDependencyError extends Error {
    cycle;
    variableName;
    constructor(cycle, variableName) {
        super(`Cyclic dependency detected: ${cycle.join(' -> ')} -> ${variableName}`);
        this.cycle = cycle;
        this.variableName = variableName;
        this.name = 'CyclicDependencyError';
    }
}
export class UnknownVariableError extends Error {
    variableName;
    referencedIn;
    constructor(variableName, referencedIn) {
        super(`Unknown variable '${variableName}' referenced in expression for '${referencedIn}'`);
        this.variableName = variableName;
        this.referencedIn = referencedIn;
        this.name = 'UnknownVariableError';
    }
}
function createSeededRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
}
function extractDependencies(source) {
    const compiled = compile(source);
    return compiled.dependencies.filter((dep) => !['score', 'lives', 'time', 'wave', 'dt', 'frameId', 'PI', 'E', 'self', 'true', 'false'].includes(dep));
}
export class EvalContextBuilder {
    nodes = new Map();
    globalNames = new Set([
        'score',
        'lives',
        'time',
        'wave',
        'dt',
        'frameId',
        'PI',
        'E',
        'self',
        'true',
        'false',
    ]);
    build(options) {
        const { gameState, variables = {}, self, seed = 12345 } = options;
        this.nodes.clear();
        for (const [name, variable] of Object.entries(variables)) {
            // Extract the actual value from VariableWithTuning if needed
            const value = getValue(variable);
            const deps = isExpression(value) ? extractDependencies(value.expr) : [];
            this.nodes.set(name, {
                name,
                value,
                dependencies: deps,
                resolved: false,
            });
        }
        this.validateDependencies();
        const resolvedVariables = {};
        const tempContext = {
            ...gameState,
            variables: resolvedVariables,
            self,
            random: createSeededRandom(seed),
        };
        const sortedNames = this.topologicalSort();
        for (const name of sortedNames) {
            const node = this.nodes.get(name);
            if (isExpression(node.value)) {
                const compiled = compile(node.value.expr);
                resolvedVariables[name] = compiled.evaluate(tempContext);
            }
            else {
                resolvedVariables[name] = node.value;
            }
            node.resolved = true;
            node.resolvedValue = resolvedVariables[name];
        }
        return {
            ...gameState,
            variables: resolvedVariables,
            self,
            random: createSeededRandom(seed),
        };
    }
    validateDependencies() {
        for (const [name, node] of this.nodes) {
            for (const dep of node.dependencies) {
                if (!this.nodes.has(dep) && !this.globalNames.has(dep)) {
                    throw new UnknownVariableError(dep, name);
                }
            }
        }
    }
    topologicalSort() {
        const result = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (name, path = []) => {
            if (visited.has(name))
                return;
            if (visiting.has(name)) {
                throw new CyclicDependencyError(path, name);
            }
            const node = this.nodes.get(name);
            if (!node)
                return;
            visiting.add(name);
            const newPath = [...path, name];
            for (const dep of node.dependencies) {
                if (this.nodes.has(dep)) {
                    visit(dep, newPath);
                }
            }
            visiting.delete(name);
            visited.add(name);
            result.push(name);
        };
        for (const name of this.nodes.keys()) {
            visit(name);
        }
        return result;
    }
    static create() {
        return new EvalContextBuilder();
    }
}
export function buildEvalContext(options) {
    return new EvalContextBuilder().build(options);
}
//# sourceMappingURL=EvalContextBuilder.js.map