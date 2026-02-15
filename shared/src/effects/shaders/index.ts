import type { EffectParamSchema, EffectType } from "../types";

import asciiGlsl from "./post/ascii.glsl";
import { meta as asciiMeta } from "./post/ascii.meta";
import bloomGlsl from "./post/bloom.glsl";
import { meta as bloomMeta } from "./post/bloom.meta";
import blurGlsl from "./post/blur.glsl";
import { meta as blurMeta } from "./post/blur.meta";
import chromaticAberrationGlsl from "./post/chromaticAberration.glsl";
import { meta as chromaticAberrationMeta } from "./post/chromaticAberration.meta";
import colorGradingGlsl from "./post/colorGrading.glsl";
import { meta as colorGradingMeta } from "./post/colorGrading.meta";
import crtGlsl from "./post/crt.glsl";
import { meta as crtMeta } from "./post/crt.meta";
import fogOfWarGlsl from "./post/fogOfWar.glsl";
import { meta as fogOfWarMeta } from "./post/fogOfWar.meta";
import glitchGlsl from "./post/glitch.glsl";
import { meta as glitchMeta } from "./post/glitch.meta";
import gridGlsl from "./post/grid.glsl";
import { meta as gridMeta } from "./post/grid.meta";
import halftoneGlsl from "./post/halftone.glsl";
import { meta as halftoneMeta } from "./post/halftone.meta";
import motionBlurGlsl from "./post/motionBlur.glsl";
import { meta as motionBlurMeta } from "./post/motionBlur.meta";
import nightVisionGlsl from "./post/nightVision.glsl";
import { meta as nightVisionMeta } from "./post/nightVision.meta";
import oldFilmGlsl from "./post/oldFilm.glsl";
import { meta as oldFilmMeta } from "./post/oldFilm.meta";
import pixelateScreenGlsl from "./post/pixelateScreen.glsl";
import { meta as pixelateScreenMeta } from "./post/pixelateScreen.meta";
import rbAuroraGlsl from "./post/rbAurora.glsl";
import { meta as rbAuroraMeta } from "./post/rbAurora.meta";
import rbBalatroGlsl from "./post/rbBalatro.glsl";
import { meta as rbBalatroMeta } from "./post/rbBalatro.meta";
import rbColorBendsGlsl from "./post/rbColorBends.glsl";
import { meta as rbColorBendsMeta } from "./post/rbColorBends.meta";
import rbDarkVeilGlsl from "./post/rbDarkVeil.glsl";
import { meta as rbDarkVeilMeta } from "./post/rbDarkVeil.meta";
import rbFaultyTerminalGlsl from "./post/rbFaultyTerminal.glsl";
import { meta as rbFaultyTerminalMeta } from "./post/rbFaultyTerminal.meta";
import rbFloatingLinesGlsl from "./post/rbFloatingLines.glsl";
import { meta as rbFloatingLinesMeta } from "./post/rbFloatingLines.meta";
import rbGalaxyGlsl from "./post/rbGalaxy.glsl";
import { meta as rbGalaxyMeta } from "./post/rbGalaxy.meta";
import rbGradientBlindsGlsl from "./post/rbGradientBlinds.glsl";
import { meta as rbGradientBlindsMeta } from "./post/rbGradientBlinds.meta";
import rbGrainientGlsl from "./post/rbGrainient.glsl";
import { meta as rbGrainientMeta } from "./post/rbGrainient.meta";
import rbIridescenceGlsl from "./post/rbIridescence.glsl";
import { meta as rbIridescenceMeta } from "./post/rbIridescence.meta";
import rbLightningGlsl from "./post/rbLightning.glsl";
import { meta as rbLightningMeta } from "./post/rbLightning.meta";
import rbLightRaysGlsl from "./post/rbLightRays.glsl";
import { meta as rbLightRaysMeta } from "./post/rbLightRays.meta";
import rbLiquidChromeGlsl from "./post/rbLiquidChrome.glsl";
import { meta as rbLiquidChromeMeta } from "./post/rbLiquidChrome.meta";
import rbMetaBallsGlsl from "./post/rbMetaBalls.glsl";
import { meta as rbMetaBallsMeta } from "./post/rbMetaBalls.meta";
import rbOrbGlsl from "./post/rbOrb.glsl";
import { meta as rbOrbMeta } from "./post/rbOrb.meta";
import rbPlasmaGlsl from "./post/rbPlasma.glsl";
import { meta as rbPlasmaMeta } from "./post/rbPlasma.meta";
import rbPrismGlsl from "./post/rbPrism.glsl";
import { meta as rbPrismMeta } from "./post/rbPrism.meta";
import rbShapeBlurGlsl from "./post/rbShapeBlur.glsl";
import { meta as rbShapeBlurMeta } from "./post/rbShapeBlur.meta";
import rbSilkGlsl from "./post/rbSilk.glsl";
import { meta as rbSilkMeta } from "./post/rbSilk.meta";
import rbThreadsGlsl from "./post/rbThreads.glsl";
import { meta as rbThreadsMeta } from "./post/rbThreads.meta";
import rippleGlsl from "./post/ripple.glsl";
import { meta as rippleMeta } from "./post/ripple.meta";
import scanlinesGlsl from "./post/scanlines.glsl";
import { meta as scanlinesMeta } from "./post/scanlines.meta";
import shimmerGlsl from "./post/shimmer.glsl";
import { meta as shimmerMeta } from "./post/shimmer.meta";
import shockwaveGlsl from "./post/shockwave.glsl";
import { meta as shockwaveMeta } from "./post/shockwave.meta";
import speedLinesGlsl from "./post/speedLines.glsl";
import { meta as speedLinesMeta } from "./post/speedLines.meta";
import thermalVisionGlsl from "./post/thermalVision.glsl";
import { meta as thermalVisionMeta } from "./post/thermalVision.meta";
import underwaterGlsl from "./post/underwater.glsl";
import { meta as underwaterMeta } from "./post/underwater.meta";
import vignetteGlsl from "./post/vignette.glsl";
import { meta as vignetteMeta } from "./post/vignette.meta";
import colorMatrixGlsl from "./sprite/colorMatrix.glsl";
import { meta as colorMatrixMeta } from "./sprite/colorMatrix.meta";
import dissolveGlsl from "./sprite/dissolve.glsl";
import { meta as dissolveMeta } from "./sprite/dissolve.meta";
import dropShadowGlsl from "./sprite/dropShadow.glsl";
import { meta as dropShadowMeta } from "./sprite/dropShadow.meta";
import flashGlsl from "./sprite/flash.glsl";
import { meta as flashMeta } from "./sprite/flash.meta";
import glowGlsl from "./sprite/glow.glsl";
import { meta as glowMeta } from "./sprite/glow.meta";
import holographicGlsl from "./sprite/holographic.glsl";
import { meta as holographicMeta } from "./sprite/holographic.meta";
import innerGlowGlsl from "./sprite/innerGlow.glsl";
import { meta as innerGlowMeta } from "./sprite/innerGlow.meta";
import outlineGlsl from "./sprite/outline.glsl";
import { meta as outlineMeta } from "./sprite/outline.meta";
import pixelateGlsl from "./sprite/pixelate.glsl";
import { meta as pixelateMeta } from "./sprite/pixelate.meta";
import posterizeGlsl from "./sprite/posterize.glsl";
import { meta as posterizeMeta } from "./sprite/posterize.meta";
import rainbowGlsl from "./sprite/rainbow.glsl";
import { meta as rainbowMeta } from "./sprite/rainbow.meta";
import rimLightGlsl from "./sprite/rimLight.glsl";
import { meta as rimLightMeta } from "./sprite/rimLight.meta";
import silhouetteGlsl from "./sprite/silhouette.glsl";
import { meta as silhouetteMeta } from "./sprite/silhouette.meta";
import tintGlsl from "./sprite/tint.glsl";
import { meta as tintMeta } from "./sprite/tint.meta";
import waveDistortionGlsl from "./sprite/waveDistortion.glsl";
import { meta as waveDistortionMeta } from "./sprite/waveDistortion.meta";

export type ShaderCategory =
	| "distort"
	| "color"
	| "blur"
	| "generator"
	| "composite"
	| "glow"
	| "artistic"
	| "utility";

export interface ShaderLibraryEntry {
	id: string;
	glsl: string;
	paramsSchema: EffectParamSchema[];
	aiHints: {
		description: string;
		aliases: string[];
		category: ShaderCategory;
		combinability: string[];
	};
	previewThumbnail?: string;
}

export const SHADER_LIBRARY: Record<string, string> = {
	ascii: asciiGlsl,
	bloom: bloomGlsl,
	blur: blurGlsl,
	chromaticAberration: chromaticAberrationGlsl,
	colorGrading: colorGradingGlsl,
	crt: crtGlsl,
	fogOfWar: fogOfWarGlsl,
	glitch: glitchGlsl,
	grid: gridGlsl,
	halftone: halftoneGlsl,
	motionBlur: motionBlurGlsl,
	nightVision: nightVisionGlsl,
	oldFilm: oldFilmGlsl,
	pixelateScreen: pixelateScreenGlsl,
	rbAurora: rbAuroraGlsl,
	rbBalatro: rbBalatroGlsl,
	rbColorBends: rbColorBendsGlsl,
	rbDarkVeil: rbDarkVeilGlsl,
	rbFaultyTerminal: rbFaultyTerminalGlsl,
	rbFloatingLines: rbFloatingLinesGlsl,
	rbGalaxy: rbGalaxyGlsl,
	rbGradientBlinds: rbGradientBlindsGlsl,
	rbGrainient: rbGrainientGlsl,
	rbIridescence: rbIridescenceGlsl,
	rbLightRays: rbLightRaysGlsl,
	rbLightning: rbLightningGlsl,
	rbLiquidChrome: rbLiquidChromeGlsl,
	rbMetaBalls: rbMetaBallsGlsl,
	rbOrb: rbOrbGlsl,
	rbPlasma: rbPlasmaGlsl,
	rbPrism: rbPrismGlsl,
	rbShapeBlur: rbShapeBlurGlsl,
	rbSilk: rbSilkGlsl,
	rbThreads: rbThreadsGlsl,
	ripple: rippleGlsl,
	scanlines: scanlinesGlsl,
	shimmer: shimmerGlsl,
	shockwave: shockwaveGlsl,
	speedLines: speedLinesGlsl,
	thermalVision: thermalVisionGlsl,
	underwater: underwaterGlsl,
	vignette: vignetteGlsl,
	colorMatrix: colorMatrixGlsl,
	dissolve: dissolveGlsl,
	dropShadow: dropShadowGlsl,
	flash: flashGlsl,
	glow: glowGlsl,
	holographic: holographicGlsl,
	innerGlow: innerGlowGlsl,
	outline: outlineGlsl,
	pixelate: pixelateGlsl,
	posterize: posterizeGlsl,
	rainbow: rainbowGlsl,
	rimLight: rimLightGlsl,
	silhouette: silhouetteGlsl,
	tint: tintGlsl,
	waveDistortion: waveDistortionGlsl,
};

export const SHADER_REGISTRY: Record<string, ShaderLibraryEntry> = {
	ascii: asciiMeta,
	bloom: bloomMeta,
	blur: blurMeta,
	chromaticAberration: chromaticAberrationMeta,
	colorGrading: colorGradingMeta,
	crt: crtMeta,
	fogOfWar: fogOfWarMeta,
	glitch: glitchMeta,
	grid: gridMeta,
	halftone: halftoneMeta,
	motionBlur: motionBlurMeta,
	nightVision: nightVisionMeta,
	oldFilm: oldFilmMeta,
	pixelateScreen: pixelateScreenMeta,
	rbAurora: rbAuroraMeta,
	rbBalatro: rbBalatroMeta,
	rbColorBends: rbColorBendsMeta,
	rbDarkVeil: rbDarkVeilMeta,
	rbFaultyTerminal: rbFaultyTerminalMeta,
	rbFloatingLines: rbFloatingLinesMeta,
	rbGalaxy: rbGalaxyMeta,
	rbGradientBlinds: rbGradientBlindsMeta,
	rbGrainient: rbGrainientMeta,
	rbIridescence: rbIridescenceMeta,
	rbLightRays: rbLightRaysMeta,
	rbLightning: rbLightningMeta,
	rbLiquidChrome: rbLiquidChromeMeta,
	rbMetaBalls: rbMetaBallsMeta,
	rbOrb: rbOrbMeta,
	rbPlasma: rbPlasmaMeta,
	rbPrism: rbPrismMeta,
	rbShapeBlur: rbShapeBlurMeta,
	rbSilk: rbSilkMeta,
	rbThreads: rbThreadsMeta,
	ripple: rippleMeta,
	scanlines: scanlinesMeta,
	shimmer: shimmerMeta,
	shockwave: shockwaveMeta,
	speedLines: speedLinesMeta,
	thermalVision: thermalVisionMeta,
	underwater: underwaterMeta,
	vignette: vignetteMeta,
	colorMatrix: colorMatrixMeta,
	dissolve: dissolveMeta,
	dropShadow: dropShadowMeta,
	flash: flashMeta,
	glow: glowMeta,
	holographic: holographicMeta,
	innerGlow: innerGlowMeta,
	outline: outlineMeta,
	pixelate: pixelateMeta,
	posterize: posterizeMeta,
	rainbow: rainbowMeta,
	rimLight: rimLightMeta,
	silhouette: silhouetteMeta,
	tint: tintMeta,
	waveDistortion: waveDistortionMeta,
};

export function getShaderGlsl(effectType: string): string | null {
	return SHADER_LIBRARY[effectType] ?? null;
}

export function getShaderGlslStrict(effectType: EffectType): string {
	const glsl = SHADER_LIBRARY[effectType];
	if (!glsl) {
		throw new Error(`Unknown effect type in shader library: ${effectType}`);
	}
	return glsl;
}

export function getAvailableShaderKeys(): string[] {
	return Object.keys(SHADER_LIBRARY);
}

export function getShaderEntry(id: string): ShaderLibraryEntry | null {
	return SHADER_REGISTRY[id] ?? null;
}

export function listShadersByCategory(
	category: ShaderCategory,
): ShaderLibraryEntry[] {
	return Object.values(SHADER_REGISTRY).filter(
		(entry) => entry.aiHints.category === category,
	);
}

export function searchShaders(query: string): ShaderLibraryEntry[] {
	const q = query.toLowerCase();
	const scored: Array<{ entry: ShaderLibraryEntry; score: number }> = [];

	for (const entry of Object.values(SHADER_REGISTRY)) {
		let score = 0;

		if (entry.id.toLowerCase() === q) {
			score += 20;
		} else if (entry.id.toLowerCase().includes(q)) {
			score += 8;
		}

		for (const alias of entry.aiHints.aliases) {
			if (alias.toLowerCase() === q) {
				score += 15;
			} else if (alias.toLowerCase().includes(q)) {
				score += 6;
			}
		}

		if (entry.aiHints.description.toLowerCase().includes(q)) {
			score += 3;
		}

		if (entry.aiHints.category.toLowerCase() === q) {
			score += 4;
		}

		if (score > 0) {
			scored.push({ entry, score });
		}
	}

	scored.sort((a, b) => {
		const diff = b.score - a.score;
		if (diff !== 0) return diff;
		return a.entry.id.localeCompare(b.entry.id);
	});

	return scored.map((s) => s.entry);
}

export function getCombinableShaders(id: string): string[] {
	const entry = SHADER_REGISTRY[id];
	if (!entry) return [];
	return entry.aiHints.combinability.filter((cid) => cid in SHADER_REGISTRY);
}

export function getAllShaderCategories(): ShaderCategory[] {
	const categories = new Set<ShaderCategory>();
	for (const entry of Object.values(SHADER_REGISTRY)) {
		categories.add(entry.aiHints.category);
	}
	return [...categories].sort();
}

export function getShaderCount(): number {
	return Object.keys(SHADER_REGISTRY).length;
}
