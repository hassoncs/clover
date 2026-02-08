import type { EffectGraphSpec, CompiledPlan } from './types';
import type { PackageManifest } from './registry';

export type PackageStatus = 'draft' | 'published' | 'deprecated';
export type SourceType = 'system' | 'user' | 'ai';
export type LicenseType = 'open' | 'custom' | 'proprietary';

export interface ShaderPackage {
  id: string;
  slug: string;
  status: PackageStatus;
  engineApiVersion: string;
  sourceType: SourceType;
  creatorId?: string;
  license: LicenseType;
  manifest: PackageManifest;
  createdAt: string;
  updatedAt: string;
}

export interface ShaderPackageVersion {
  id: string;
  packageId: string;
  version: string;
  graphSpec: EffectGraphSpec;
  compiledPlan: CompiledPlan;
  provenance: PackageProvenance;
  preview?: { thumbnailR2Key: string };
  publishedAt?: string;
  createdAt: string;
}

export interface PackageProvenance {
  sourceType: SourceType;
  compiledPrompt?: string;
  generationJobId?: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  errors: CompatibilityError[];
}

export interface CompatibilityError {
  code:
    | 'E_ENGINE_VERSION_MISMATCH'
    | 'E_DEPRECATED_PACKAGE'
    | 'E_MISSING_DEPENDENCY';
  message: string;
}

interface CreateDraftParams {
  slug: string;
  manifest: PackageManifest;
  engineApiVersion: string;
  creatorId?: string;
  license: LicenseType;
  sourceType?: SourceType;
}

interface PublishVersionParams {
  version: string;
  graphSpec: EffectGraphSpec;
  compiledPlan: CompiledPlan;
  provenance: PackageProvenance;
  preview?: { thumbnailR2Key: string };
}

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

let counter = 0;
function generateId(): string {
  counter += 1;
  return `pkg_${Date.now()}_${counter}`;
}

function generateVersionId(): string {
  counter += 1;
  return `ver_${Date.now()}_${counter}`;
}

export class ShaderPackageManager {
  private packages = new Map<string, ShaderPackage>();
  private slugIndex = new Map<string, string>();
  private versions = new Map<string, ShaderPackageVersion[]>();

  createDraft(params: CreateDraftParams): ShaderPackage {
    if (this.slugIndex.has(params.slug)) {
      throw new Error(`Slug "${params.slug}" already exists`);
    }

    const now = new Date().toISOString();
    const pkg: ShaderPackage = {
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

  updateDraft(
    id: string,
    updates: Partial<Pick<ShaderPackage, 'manifest' | 'license'>>,
  ): ShaderPackage {
    const pkg = this.packages.get(id);
    if (!pkg) throw new Error(`Package "${id}" not found`);
    if (pkg.sourceType === 'system') throw new Error('System packages are not editable');
    if (pkg.status !== 'draft') throw new Error(`Cannot update: package is not draft (status: ${pkg.status})`);

    const updated: ShaderPackage = {
      ...pkg,
      ...(updates.manifest !== undefined && { manifest: updates.manifest }),
      ...(updates.license !== undefined && { license: updates.license }),
      updatedAt: new Date().toISOString(),
    };

    this.packages.set(id, updated);
    return updated;
  }

  publish(packageId: string, params: PublishVersionParams): ShaderPackageVersion {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error(`Package "${packageId}" not found`);
    if (pkg.status === 'deprecated') throw new Error('Cannot publish: package is deprecated');

    if (!SEMVER_RE.test(params.version)) {
      throw new Error(`Invalid semver version: "${params.version}"`);
    }

    const existing = this.versions.get(packageId) ?? [];
    if (existing.some((v) => v.version === params.version)) {
      throw new Error(`Version "${params.version}" already exists for package "${packageId}"`);
    }

    const now = new Date().toISOString();
    const version: ShaderPackageVersion = {
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

  deprecate(id: string): ShaderPackage {
    const pkg = this.packages.get(id);
    if (!pkg) throw new Error(`Package "${id}" not found`);
    if (pkg.status === 'draft') throw new Error('Cannot deprecate a draft package');

    const updated: ShaderPackage = {
      ...pkg,
      status: 'deprecated',
      updatedAt: new Date().toISOString(),
    };

    this.packages.set(id, updated);
    return updated;
  }

  checkCompatibility(
    packageVersion: ShaderPackageVersion,
    currentEngineVersion: string,
  ): CompatibilityResult {
    const errors: CompatibilityError[] = [];

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

  get(id: string): ShaderPackage | undefined {
    return this.packages.get(id);
  }

  getVersion(packageId: string, version: string): ShaderPackageVersion | undefined {
    return this.versions.get(packageId)?.find((v) => v.version === version);
  }

  listVersions(packageId: string): ShaderPackageVersion[] {
    return [...(this.versions.get(packageId) ?? [])];
  }
}
