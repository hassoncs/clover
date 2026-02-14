import type {
	BuildManifest,
	EntityPrefab,
	GameEntity,
	TagPayloads,
} from "@slopcade/shared";

import { TAG_GROUPS } from "@slopcade/shared";

export interface ValidationError {
	code: string;
	message: string;
	path: string;
	severity: "error" | "warning";
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function validateManifestStructure(
	manifest: BuildManifest,
	errors: ValidationError[],
	warnings: ValidationError[],
): void {
	if (!manifest.buildId) {
		errors.push({
			code: "MISSING_BUILD_ID",
			message: "Build manifest must have a buildId",
			path: "manifest.buildId",
			severity: "error",
		});
	}

	if (!manifest.packageManifest) {
		errors.push({
			code: "MISSING_PACKAGE_MANIFEST",
			message: "Build manifest must have a packageManifest",
			path: "manifest.packageManifest",
			severity: "error",
		});
	} else {
		if (!manifest.packageManifest.id) {
			errors.push({
				code: "MISSING_PACKAGE_ID",
				message: "Package manifest must have an id",
				path: "manifest.packageManifest.id",
				severity: "error",
			});
		}
		if (!manifest.packageManifest.name) {
			warnings.push({
				code: "MISSING_PACKAGE_NAME",
				message: "Package manifest should have a name",
				path: "manifest.packageManifest.name",
				severity: "warning",
			});
		}
	}

	if (!manifest.createdAt || typeof manifest.createdAt !== "number") {
		warnings.push({
			code: "MISSING_CREATED_AT",
			message: "Build manifest should have a numeric createdAt timestamp",
			path: "manifest.createdAt",
			severity: "warning",
		});
	}

	if (!Array.isArray(manifest.artifacts)) {
		errors.push({
			code: "MISSING_ARTIFACTS",
			message: "Build manifest must have an artifacts array",
			path: "manifest.artifacts",
			severity: "error",
		});
	}
}

function validateArtifactHashes(
	manifest: BuildManifest,
	artifacts: Partial<TagPayloads>,
	errors: ValidationError[],
): void {
	for (const artifactEntry of manifest.artifacts) {
		const tag = artifactEntry.tag;
		if (!TAG_GROUPS.includes(tag)) {
			errors.push({
				code: "UNKNOWN_TAG_GROUP",
				message: `Unknown tag group "${tag}" in manifest artifacts`,
				path: `manifest.artifacts.${tag}`,
				severity: "error",
			});
			continue;
		}

		if (!(tag in artifacts)) {
			errors.push({
				code: "MISSING_ARTIFACT_DATA",
				message: `Manifest references tag "${tag}" but no artifact data provided`,
				path: `artifacts.${tag}`,
				severity: "error",
			});
		}

		if (!artifactEntry.hash) {
			errors.push({
				code: "MISSING_ARTIFACT_HASH",
				message: `Artifact "${tag}" is missing a content hash`,
				path: `manifest.artifacts.${tag}.hash`,
				severity: "error",
			});
		}
	}
}

function validatePrefabs(
	prefabs: Record<string, EntityPrefab>,
	errors: ValidationError[],
	_warnings: ValidationError[],
): void {
	const prefabIds = new Set<string>();

	for (const [key, prefab] of Object.entries(prefabs)) {
		if (!prefab.id) {
			errors.push({
				code: "MISSING_PREFAB_ID",
				message: `Prefab at key "${key}" is missing an id`,
				path: `prefabs.${key}.id`,
				severity: "error",
			});
			continue;
		}

		if (prefabIds.has(prefab.id)) {
			errors.push({
				code: "DUPLICATE_PREFAB_ID",
				message: `Duplicate prefab id "${prefab.id}"`,
				path: `prefabs.${key}.id`,
				severity: "error",
			});
		}
		prefabIds.add(prefab.id);

		if (isRecord(prefab.physics)) {
			const bodyType = (prefab.physics as Record<string, unknown>).bodyType;
			if (
				bodyType &&
				typeof bodyType === "string" &&
				!["static", "dynamic", "kinematic"].includes(bodyType)
			) {
				errors.push({
					code: "INVALID_PREFAB_BODY_TYPE",
					message: `Prefab "${prefab.id}" has invalid bodyType "${bodyType}"`,
					path: `prefabs.${key}.physics.bodyType`,
					severity: "error",
				});
			}
		}
	}
}

function validateEntities(
	entities: GameEntity[],
	prefabIds: Set<string>,
	errors: ValidationError[],
	_warnings: ValidationError[],
): void {
	const entityIds = new Set<string>();

	for (const entity of entities) {
		if (!entity.id) {
			errors.push({
				code: "MISSING_ENTITY_ID",
				message: "Entity is missing an id",
				path: "entities",
				severity: "error",
			});
			continue;
		}

		if (entityIds.has(entity.id)) {
			errors.push({
				code: "DUPLICATE_ENTITY_ID",
				message: `Duplicate entity id "${entity.id}"`,
				path: `entities.${entity.id}`,
				severity: "error",
			});
		}
		entityIds.add(entity.id);

		if (entity.prefab && !prefabIds.has(entity.prefab)) {
			errors.push({
				code: "UNKNOWN_PREFAB_REFERENCE",
				message: `Entity "${entity.id}" references unknown prefab "${entity.prefab}"`,
				path: `entities.${entity.id}.prefab`,
				severity: "error",
			});
		}
	}
}

export class PackageValidator {
	validateBuild(
		manifest: BuildManifest,
		artifacts: Partial<TagPayloads>,
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationError[] = [];

		validateManifestStructure(manifest, errors, warnings);
		validateArtifactHashes(manifest, artifacts, errors);

		const prefabs = artifacts.prefabs?.prefabs ?? {};
		const prefabIds = new Set(Object.keys(prefabs));
		validatePrefabs(prefabs, errors, warnings);

		const entities = artifacts.entities?.entities ?? [];
		validateEntities(entities, prefabIds, errors, warnings);

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}
}
