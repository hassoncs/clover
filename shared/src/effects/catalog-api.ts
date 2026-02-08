import type { EffectGraphSpec, CompiledPlan } from './types';
import type { PackageManifest } from './registry';
import type {
  ShaderPackage,
  ShaderPackageVersion,
  PackageProvenance,
  PackageStatus,
  LicenseType,
  SourceType,
} from './package';

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export type ModerationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'deprecated';

export interface ModerationTransition {
  from: ModerationStatus;
  to: ModerationStatus;
  reason?: string;
  moderatorId?: string;
  timestamp: string;
}

export const VALID_MODERATION_TRANSITIONS: Record<ModerationStatus, ModerationStatus[]> = {
  pending_review: ['approved', 'rejected'],
  approved: ['published'],
  rejected: ['pending_review'],
  published: ['deprecated'],
  deprecated: [],
};

export function isValidModerationTransition(
  from: ModerationStatus,
  to: ModerationStatus,
): boolean {
  return VALID_MODERATION_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Catalog query / result
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// R2 storage conventions
// ---------------------------------------------------------------------------

export interface R2PathResolver {
  graphSpec(packageId: string, version: string): string;
  compiledPlan(packageId: string, version: string): string;
  preview(packageId: string, version: string): string;
  provenance(packageId: string, version: string): string;
}

export function createR2PathResolver(): R2PathResolver {
  return {
    graphSpec: (pkgId, ver) => `shaders/${pkgId}/${ver}/graph-spec.json`,
    compiledPlan: (pkgId, ver) => `shaders/${pkgId}/${ver}/compiled-plan.json`,
    preview: (pkgId, ver) => `shaders/${pkgId}/${ver}/preview.png`,
    provenance: (pkgId, ver) => `shaders/${pkgId}/${ver}/provenance.json`,
  };
}

// ---------------------------------------------------------------------------
// Runtime fetch policy
// ---------------------------------------------------------------------------

export interface PackageFetchPolicy {
  resolve(packageId: string, version: string): Promise<PackageFetchResult>;
}

export interface PackageFetchResult {
  source: 'cache' | 'local-mirror' | 'remote';
  data?: ShaderPackageVersion;
  error?: string;
}

// ---------------------------------------------------------------------------
// Catalog API contract (tRPC-style)
// ---------------------------------------------------------------------------

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
  preview?: { thumbnailR2Key: string };
}

export interface CatalogAPI {
  createDraft(input: CreateDraftInput): Promise<ShaderPackage>;
  updateDraft(input: UpdateDraftInput): Promise<ShaderPackage>;
  publish(input: PublishInput): Promise<ShaderPackageVersion>;
  list(query: CatalogListQuery): Promise<CatalogListResult>;
  search(query: CatalogSearchQuery): Promise<CatalogListResult>;
  getById(id: string): Promise<ShaderPackage | null>;
  getVersion(
    packageId: string,
    version: string,
  ): Promise<ShaderPackageVersion | null>;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export interface SeedEntry {
  slug: string;
  shaderVersion: string;
  manifest: PackageManifest;
  graphSpec: EffectGraphSpec;
  sourceType: 'system';
}

export async function seedBuiltInNodes(
  entries: SeedEntry[],
  catalog: CatalogAPI,
): Promise<void> {
  const existing = await catalog.list({ status: 'published', limit: 1000 });
  const slugVersionSet = new Set(
    existing.items.map((item) => `${item.slug}@${item.latestVersion}`),
  );

  for (const entry of entries) {
    const key = `${entry.slug}@${entry.shaderVersion}`;
    if (slugVersionSet.has(key)) continue;

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
