import type { z } from "zod";
import type { EvalContext, ExpressionValueType } from "../expressions/types";

export { SystemPhase } from "../types/system-phase";

import type { SystemPhase } from "../types/system-phase";

export interface SystemVersion {
	major: number;
	minor: number;
	patch: number;
}

export interface SystemManifest {
	id: string;
	version: SystemVersion;
}

export type ExpressionFunction = (
	args: ExpressionValueType[],
	ctx: EvalContext,
) => ExpressionValueType;

export interface SystemProvides {
	capabilities?: string[];
	tags?: string[];
	events?: string[];
}

export interface SystemRequires {
	capabilities?: string[];
}

export interface GameSystemDefinition<TConfig = unknown, TState = unknown> {
	id: string;
	version: SystemVersion;

	executionPhase?: SystemPhase;
	priority?: number;

	configSchema?: z.ZodType<TConfig>;

	expressionFunctions?: Record<string, ExpressionFunction>;

	actionTypes?: string[];
	behaviorTypes?: string[];

	provides?: SystemProvides;
	requires?: SystemRequires;
	conflicts?: string[];

	createState?: (config: TConfig) => TState;

	onGameLoad?: (config: TConfig, state: TState) => void;
	onGameUnload?: (state: TState) => void;
}

export interface SystemCompatibility {
	compatible: boolean;
	errors: string[];
}

export function parseVersion(versionString: string): SystemVersion {
	const parts = versionString.split(".").map(Number);
	return {
		major: parts[0] ?? 0,
		minor: parts[1] ?? 0,
		patch: parts[2] ?? 0,
	};
}

export function formatVersion(version: SystemVersion): string {
	return `${version.major}.${version.minor}.${version.patch}`;
}

export function isCompatibleVersion(
	required: SystemVersion,
	available: SystemVersion,
): boolean {
	if (available.major !== required.major) {
		return false;
	}
	if (available.minor < required.minor) {
		return false;
	}
	return true;
}
