/**
 * Type guard to check if a value is a valid LevelDefinition.
 */
export function isLevelDefinition(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const def = value;
    // Required fields
    if (typeof def.schemaVersion !== 'number')
        return false;
    if (typeof def.packId !== 'string')
        return false;
    if (typeof def.levelId !== 'string')
        return false;
    if (typeof def.generatorId !== 'string')
        return false;
    if (typeof def.generatorVersion !== 'string')
        return false;
    if (typeof def.seed !== 'string')
        return false;
    return true;
}
/**
 * Generate the full level identity string: `${packId}:${levelId}`.
 */
export function getLevelIdentity(level) {
    return `${level.packId}:${level.levelId}`;
}
/**
 * Validate that a level identity is unique within a set of levels.
 */
export function validateLevelUniqueness(levels) {
    const seen = new Set();
    const duplicates = [];
    for (const level of levels) {
        const identity = getLevelIdentity(level);
        if (seen.has(identity)) {
            duplicates.push(identity);
        }
        seen.add(identity);
    }
    return {
        valid: duplicates.length === 0,
        duplicateIds: duplicates,
    };
}
/**
 * Current schema major version.
 * Increment this when making breaking changes.
 */
export const CURRENT_LEVEL_SCHEMA_VERSION = 1;
/**
 * Minimum compatible schema version for parsing.
 * Levels with schemaVersion < this require migration.
 */
export const MIN_COMPATIBLE_SCHEMA_VERSION = 1;
//# sourceMappingURL=LevelDefinition.js.map