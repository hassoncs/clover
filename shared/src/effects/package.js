const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;
function parseSemver(v) {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match)
        return null;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}
let counter = 0;
function generateId() {
    counter += 1;
    return `pkg_${Date.now()}_${counter}`;
}
function generateVersionId() {
    counter += 1;
    return `ver_${Date.now()}_${counter}`;
}
export class ShaderPackageManager {
    packages = new Map();
    slugIndex = new Map();
    versions = new Map();
    createDraft(params) {
        if (this.slugIndex.has(params.slug)) {
            throw new Error(`Slug "${params.slug}" already exists`);
        }
        const now = new Date().toISOString();
        const pkg = {
            id: generateId(),
            slug: params.slug,
            status: 'draft',
            engineApiVersion: params.engineApiVersion,
            sourceType: params.sourceType ?? 'user',
            creatorId: params.creatorId,
            license: params.license,
            manifest: params.manifest,
            createdAt: now,
            updatedAt: now,
        };
        this.packages.set(pkg.id, pkg);
        this.slugIndex.set(pkg.slug, pkg.id);
        this.versions.set(pkg.id, []);
        return pkg;
    }
    updateDraft(id, updates) {
        const pkg = this.packages.get(id);
        if (!pkg)
            throw new Error(`Package "${id}" not found`);
        if (pkg.sourceType === 'system')
            throw new Error('System packages are not editable');
        if (pkg.status !== 'draft')
            throw new Error(`Cannot update: package is not draft (status: ${pkg.status})`);
        const updated = {
            ...pkg,
            ...(updates.manifest !== undefined && { manifest: updates.manifest }),
            ...(updates.license !== undefined && { license: updates.license }),
            updatedAt: new Date().toISOString(),
        };
        this.packages.set(id, updated);
        return updated;
    }
    publish(packageId, params) {
        const pkg = this.packages.get(packageId);
        if (!pkg)
            throw new Error(`Package "${packageId}" not found`);
        if (pkg.status === 'deprecated')
            throw new Error('Cannot publish: package is deprecated');
        if (!SEMVER_RE.test(params.version)) {
            throw new Error(`Invalid semver version: "${params.version}"`);
        }
        const existing = this.versions.get(packageId) ?? [];
        if (existing.some((v) => v.version === params.version)) {
            throw new Error(`Version "${params.version}" already exists for package "${packageId}"`);
        }
        const now = new Date().toISOString();
        const version = {
            id: generateVersionId(),
            packageId,
            version: params.version,
            graphSpec: params.graphSpec,
            compiledPlan: params.compiledPlan,
            provenance: params.provenance,
            preview: params.preview,
            publishedAt: now,
            createdAt: now,
        };
        existing.push(version);
        this.versions.set(packageId, existing);
        if (pkg.status === 'draft') {
            this.packages.set(packageId, {
                ...pkg,
                status: 'published',
                updatedAt: now,
            });
        }
        return version;
    }
    deprecate(id) {
        const pkg = this.packages.get(id);
        if (!pkg)
            throw new Error(`Package "${id}" not found`);
        if (pkg.status === 'draft')
            throw new Error('Cannot deprecate a draft package');
        const updated = {
            ...pkg,
            status: 'deprecated',
            updatedAt: new Date().toISOString(),
        };
        this.packages.set(id, updated);
        return updated;
    }
    checkCompatibility(packageVersion, currentEngineVersion) {
        const errors = [];
        const pkg = this.packages.get(packageVersion.packageId);
        if (pkg?.status === 'deprecated') {
            errors.push({
                code: 'E_DEPRECATED_PACKAGE',
                message: `Package "${packageVersion.packageId}" is deprecated`,
            });
        }
        const required = parseSemver(packageVersion.graphSpec.engineApiVersion);
        const current = parseSemver(currentEngineVersion);
        if (required && current) {
            if (current.major !== required.major || current.minor < required.minor) {
                errors.push({
                    code: 'E_ENGINE_VERSION_MISMATCH',
                    message: `Engine version ${currentEngineVersion} is not compatible with required ${packageVersion.graphSpec.engineApiVersion}`,
                });
            }
        }
        return {
            compatible: errors.length === 0,
            errors,
        };
    }
    get(id) {
        return this.packages.get(id);
    }
    getVersion(packageId, version) {
        return this.versions.get(packageId)?.find((v) => v.version === version);
    }
    listVersions(packageId) {
        return [...(this.versions.get(packageId) ?? [])];
    }
}
//# sourceMappingURL=package.js.map