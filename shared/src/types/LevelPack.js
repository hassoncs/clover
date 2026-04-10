/**
 * @file LevelPack.ts
 * @description Type definitions for level packs - containers that group related levels together.
 *
 * A LevelPack bundles multiple LevelDefinitions with shared configuration,
 * metadata, and ordering information. This enables:
 * - Game progression (unlockable levels)
 * - Difficulty tiers (easy/hard variants)
 * - Themed collections (holiday events, challenges)
 *
 * ## Pack Structure
 *
 * ```
 * LevelPack
 * ├── Metadata (id, name, version, description)
 * ├── Game Configuration (base GameDefinition shared by all levels)
 * ├── Levels (array of LevelDefinitions)
 * └── Progression Rules (unlock order, requirements)
 * ```
 *
 * ## Usage Pattern
 *
 * 1. Load the LevelPack
 * 2. Extract base GameDefinition for common prefabs/rules
 * 3. For each level, merge LevelDefinition with GameDefinition
 * 4. Apply game-specific overrides from LevelDefinition.overrides
 */
/**
 * Export level definition types for convenience
 */
export { isLevelDefinition, getLevelIdentity, validateLevelUniqueness, CURRENT_LEVEL_SCHEMA_VERSION, MIN_COMPATIBLE_SCHEMA_VERSION, } from './LevelDefinition';
/**
 * Type guard to check if a value is a valid LevelPack.
 */
export function isLevelPack(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const pack = value;
    // Required fields
    if (typeof pack.schemaVersion !== 'number')
        return false;
    if (typeof pack.metadata !== 'object' || pack.metadata === null)
        return false;
    if (!Array.isArray(pack.levels))
        return false;
    const metadata = pack.metadata;
    if (typeof metadata.id !== 'string')
        return false;
    if (typeof metadata.name !== 'string')
        return false;
    return true;
}
/**
 * Type guard to check if a value is a valid PackSummary.
 */
export function isPackSummary(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const summary = value;
    if (typeof summary.id !== 'string')
        return false;
    if (typeof summary.name !== 'string')
        return false;
    if (typeof summary.levelCount !== 'number')
        return false;
    return true;
}
/**
 * Get a level from the pack by its levelId.
 */
export function getLevelById(pack, levelId) {
    return pack.levels.find((level) => level.levelId === levelId);
}
/**
 * Get a level by its full identity: `${packId}:${levelId}`.
 */
export function getLevelByIdentity(pack, identity) {
    const [packId, levelId] = identity.split(':');
    if (packId !== pack.metadata.id) {
        return undefined;
    }
    return getLevelById(pack, levelId);
}
/**
 * Get levels ordered by their ordinal property.
 * Falls back to array order if ordinal is missing.
 */
export function getLevelsOrdered(pack) {
    return [...pack.levels].sort((a, b) => {
        if (a.ordinal !== undefined && b.ordinal !== undefined) {
            return a.ordinal - b.ordinal;
        }
        // Fallback to array order if ordinals are missing
        return 0;
    });
}
/**
 * Calculate pack statistics from level definitions.
 */
export function calculatePackStats(levels) {
    const distribution = {};
    for (const level of levels) {
        const tier = level.difficulty?.targetTier;
        if (tier) {
            switch (tier) {
                case 'trivial':
                    distribution.trivialCount = (distribution.trivialCount || 0) + 1;
                    break;
                case 'easy':
                    distribution.easyCount = (distribution.easyCount || 0) + 1;
                    break;
                case 'medium':
                    distribution.mediumCount = (distribution.mediumCount || 0) + 1;
                    break;
                case 'hard':
                    distribution.hardCount = (distribution.hardCount || 0) + 1;
                    break;
                case 'extreme':
                    distribution.extremeCount = (distribution.extremeCount || 0) + 1;
                    break;
                case 'impossible':
                    distribution.impossibleCount = (distribution.impossibleCount || 0) + 1;
                    break;
            }
        }
    }
    const totalDuration = levels.reduce((sum, level) => {
        return sum + (level.difficulty?.estimatedDurationSeconds || 300); // Default 5 min
    }, 0);
    return {
        levelCount: levels.length,
        estimatedPlaytimeMinutes: Math.round(totalDuration / 60),
        uniqueSeeds: new Set(levels.map((l) => l.seed)).size,
        difficultyDistribution: distribution,
    };
}
/**
 * Generate pack summary from a full pack.
 */
export function generatePackSummary(pack, progress) {
    const stats = pack.stats || calculatePackStats(pack.levels);
    // Build difficulty summary string
    const difficultyParts = [];
    const dist = stats.difficultyDistribution;
    if (dist?.easyCount)
        difficultyParts.push(`${dist.easyCount}E`);
    if (dist?.mediumCount)
        difficultyParts.push(`${dist.mediumCount}M`);
    if (dist?.hardCount)
        difficultyParts.push(`${dist.hardCount}H`);
    const difficultySummary = difficultyParts.join('/') || 'Mixed';
    return {
        id: pack.metadata.id,
        name: pack.metadata.name,
        description: pack.metadata.description,
        version: pack.version,
        category: pack.metadata.category,
        levelCount: stats.levelCount,
        difficultySummary,
        thumbnailUrl: pack.metadata.thumbnailUrl,
        thumbnailAssetRef: pack.metadata.thumbnailAssetRef,
        isComplete: progress?.progressPercent === 100,
        progressPercent: progress?.progressPercent,
    };
}
/**
 * Validate pack-level identity uniqueness.
 */
export function validatePackLevelIdentities(pack) {
    const errors = [];
    const seen = new Set();
    for (const level of pack.levels) {
        const identity = `${pack.metadata.id}:${level.levelId}`;
        if (seen.has(identity)) {
            errors.push(`Duplicate level identity: ${identity}`);
        }
        seen.add(identity);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Check if a level is unlocked based on progression rules.
 */
export function isLevelUnlocked(pack, levelId, completedLevelIds) {
    if (!pack.progression) {
        return true; // No restrictions
    }
    const level = getLevelById(pack, levelId);
    if (!level) {
        return false;
    }
    const prerequisites = pack.progression.prerequisites || [];
    if (prerequisites.length > 0) {
        const allPrereqsMet = prerequisites.every((prereqId) => completedLevelIds.includes(prereqId));
        if (!allPrereqsMet) {
            return false;
        }
    }
    return true;
}
/**
 * Current schema major version for LevelPack.
 */
export const CURRENT_PACK_SCHEMA_VERSION = 1;
/**
 * Minimum compatible schema version for parsing packs.
 */
export const MIN_COMPATIBLE_PACK_VERSION = 1;
//# sourceMappingURL=LevelPack.js.map