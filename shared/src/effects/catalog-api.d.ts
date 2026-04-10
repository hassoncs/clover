import type { EffectGraphSpec, CompiledPlan } from './types';
import type { PackageManifest } from './registry';
import type { ShaderPackage, ShaderPackageVersion, PackageProvenance, PackageStatus, LicenseType } from './package';
export type ModerationStatus = 'pending_review' | 'approved' | 'rejected' | 'published' | 'deprecated';
export interface ModerationTransition {
    from: ModerationStatus;
    to: ModerationStatus;
    reason?: string;
    moderatorId?: string;
    timestamp: string;
}
export declare const VALID_MODERATION_TRANSITIONS: Record<ModerationStatus, ModerationStatus[]>;
export declare function isValidModerationTransition(from: ModerationStatus, to: ModerationStatus): boolean;
export interface CatalogListQuery {
    tags?: string[];
    scope?: 'screen' | 'entity';
    author?: string;
    status?: PackageStatus;
    sortBy?: 'recency' | 'popularity' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
export interface CatalogSearchQuery extends CatalogListQuery {
    text: string;
}
export interface CatalogListResult {
    items: ShaderPackageSummary[];
    total: number;
    hasMore: boolean;
}
export interface ShaderPackageSummary {
    id: string;
    slug: string;
    name: string;
    description: string;
    status: PackageStatus;
    tags: string[];
    latestVersion: string;
    creatorId?: string;
    license: LicenseType;
    thumbnailUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface R2PathResolver {
    graphSpec(packageId: string, version: string): string;
    compiledPlan(packageId: string, version: string): string;
    preview(packageId: string, version: string): string;
    provenance(packageId: string, version: string): string;
}
export declare function createR2PathResolver(): R2PathResolver;
export interface PackageFetchPolicy {
    resolve(packageId: string, version: string): Promise<PackageFetchResult>;
}
export interface PackageFetchResult {
    source: 'cache' | 'local-mirror' | 'remote';
    data?: ShaderPackageVersion;
    error?: string;
}
export interface CreateDraftInput {
    slug: string;
    manifest: PackageManifest;
    engineApiVersion: string;
    creatorId?: string;
    license: LicenseType;
}
export interface UpdateDraftInput {
    id: string;
    manifest?: Partial<PackageManifest>;
    license?: LicenseType;
}
export interface PublishInput {
    packageId: string;
    version: string;
    graphSpec: EffectGraphSpec;
    compiledPlan: CompiledPlan;
    provenance: PackageProvenance;
    preview?: {
        thumbnailR2Key: string;
    };
}
export interface CatalogAPI {
    createDraft(input: CreateDraftInput): Promise<ShaderPackage>;
    updateDraft(input: UpdateDraftInput): Promise<ShaderPackage>;
    publish(input: PublishInput): Promise<ShaderPackageVersion>;
    list(query: CatalogListQuery): Promise<CatalogListResult>;
    search(query: CatalogSearchQuery): Promise<CatalogListResult>;
    getById(id: string): Promise<ShaderPackage | null>;
    getVersion(packageId: string, version: string): Promise<ShaderPackageVersion | null>;
}
export interface SeedEntry {
    slug: string;
    shaderVersion: string;
    manifest: PackageManifest;
    graphSpec: EffectGraphSpec;
    sourceType: 'system';
}
export declare function seedBuiltInNodes(entries: SeedEntry[], catalog: CatalogAPI): Promise<void>;
//# sourceMappingURL=catalog-api.d.ts.map