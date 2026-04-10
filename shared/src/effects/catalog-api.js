export const VALID_MODERATION_TRANSITIONS = {
    pending_review: ['approved', 'rejected'],
    approved: ['published'],
    rejected: ['pending_review'],
    published: ['deprecated'],
    deprecated: [],
};
export function isValidModerationTransition(from, to) {
    return VALID_MODERATION_TRANSITIONS[from].includes(to);
}
export function createR2PathResolver() {
    return {
        graphSpec: (pkgId, ver) => `shaders/${pkgId}/${ver}/graph-spec.json`,
        compiledPlan: (pkgId, ver) => `shaders/${pkgId}/${ver}/compiled-plan.json`,
        preview: (pkgId, ver) => `shaders/${pkgId}/${ver}/preview.png`,
        provenance: (pkgId, ver) => `shaders/${pkgId}/${ver}/provenance.json`,
    };
}
export async function seedBuiltInNodes(entries, catalog) {
    const existing = await catalog.list({ status: 'published', limit: 1000 });
    const slugVersionSet = new Set(existing.items.map((item) => `${item.slug}@${item.latestVersion}`));
    for (const entry of entries) {
        const key = `${entry.slug}@${entry.shaderVersion}`;
        if (slugVersionSet.has(key))
            continue;
        const pkg = await catalog.createDraft({
            slug: entry.slug,
            manifest: entry.manifest,
            engineApiVersion: entry.graphSpec.engineApiVersion,
            license: entry.manifest.license,
        });
        await catalog.publish({
            packageId: pkg.id,
            version: entry.shaderVersion,
            graphSpec: entry.graphSpec,
            compiledPlan: {
                id: `plan-${pkg.id}`,
                graphId: entry.graphSpec.id,
                graphVersion: entry.graphSpec.version,
                engineApiVersion: entry.graphSpec.engineApiVersion,
                scope: entry.graphSpec.scope,
                passes: [],
                resourceMap: {},
                feedbackPolicies: {},
                hash: '',
                compiledAt: new Date().toISOString(),
            },
            provenance: {
                sourceType: entry.sourceType,
            },
        });
    }
}
//# sourceMappingURL=catalog-api.js.map