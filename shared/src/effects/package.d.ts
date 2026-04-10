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
    preview?: {
        thumbnailR2Key: string;
    };
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
    code: 'E_ENGINE_VERSION_MISMATCH' | 'E_DEPRECATED_PACKAGE' | 'E_MISSING_DEPENDENCY';
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
    preview?: {
        thumbnailR2Key: string;
    };
}
export declare class ShaderPackageManager {
    private packages;
    private slugIndex;
    private versions;
    createDraft(params: CreateDraftParams): ShaderPackage;
    updateDraft(id: string, updates: Partial<Pick<ShaderPackage, 'manifest' | 'license'>>): ShaderPackage;
    publish(packageId: string, params: PublishVersionParams): ShaderPackageVersion;
    deprecate(id: string): ShaderPackage;
    checkCompatibility(packageVersion: ShaderPackageVersion, currentEngineVersion: string): CompatibilityResult;
    get(id: string): ShaderPackage | undefined;
    getVersion(packageId: string, version: string): ShaderPackageVersion | undefined;
    listVersions(packageId: string): ShaderPackageVersion[];
}
export {};
//# sourceMappingURL=package.d.ts.map