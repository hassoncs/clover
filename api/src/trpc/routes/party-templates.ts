import { z } from "zod";
import { publicProcedure, router } from "@/trpc/index";

import aboutYouBluffManifest from "../../../../r2/games/party/about-you-bluff/manifest.json";
import chainReactionManifest from "../../../../r2/games/party/chain-reaction/manifest.json";
import chromaCluesManifest from "../../../../r2/games/party/chroma-clues/manifest.json";
import consensusMineManifest from "../../../../r2/games/party/consensus-mine/manifest.json";
import drawfulAnimateManifest from "../../../../r2/games/party/drawful-animate/manifest.json";
import halfAndHalfManifest from "../../../../r2/games/party/half-and-half/manifest.json";
import headsUpManifest from "../../../../r2/games/party/headsUp/manifest.json";
import lexiconLadderManifest from "../../../../r2/games/party/lexicon-ladder/manifest.json";
import outOfContextManifest from "../../../../r2/games/party/out-of-context/manifest.json";
import percentPanicManifest from "../../../../r2/games/party/percent-panic/manifest.json";
import punchlineFerryManifest from "../../../../r2/games/party/punchline-ferry/manifest.json";
import quickfireQAManifest from "../../../../r2/games/party/quickfire-qa/manifest.json";
import quiplashManifest from "../../../../r2/games/party/quiplash/manifest.json";
import rivalRosterManifest from "../../../../r2/games/party/rival-roster/manifest.json";
import roleReplayManifest from "../../../../r2/games/party/role-replay/manifest.json";
import ruinAndRedeemManifest from "../../../../r2/games/party/ruin-and-redeem/manifest.json";
import shirtClashManifest from "../../../../r2/games/party/shirt-clash/manifest.json";
import sketchBluffManifest from "../../../../r2/games/party/sketch-bluff/manifest.json";
import spectrumGuessManifest from "../../../../r2/games/party/spectrum-guess/manifest.json";
import truthTrapManifest from "../../../../r2/games/party/truth-trap/manifest.json";
import yearJinxManifest from "../../../../r2/games/party/year-jinx/manifest.json";

// Manifests have two schemas: flat (most games) and metadata-nested (spectrum-guess)
type FlatManifest = {
	slug: string;
	title: string;
	description: string;
	instructions?: string;
	brands?: string[];
	brandTitles?: Record<string, { title: string; description: string }>;
	party?: {
		minPlayers?: number;
		maxPlayers?: number;
		contentPacks?: string[];
		phases?: string[];
		inputTypes?: string[];
		roundCount?: number;
	};
};

type NestedManifest = {
	metadata: {
		slug: string;
		title: string;
		description: string;
		instructions?: string;
	};
	brands?: string[];
	brandTitles?: Record<string, { title: string; description: string }>;
	party?: {
		minPlayers?: number;
		maxPlayers?: number;
		contentPacks?: string[];
		roundCount?: number;
	};
};

type RawManifest = FlatManifest | NestedManifest;

function normalizeManifest(raw: RawManifest): {
	slug: string;
	title: string;
	description: string;
	instructions: string;
	brands: string[];
	brandTitles: Record<string, { title: string; description: string }>;
	party: {
		minPlayers: number;
		maxPlayers: number;
		contentPacks: string[];
		roundCount: number;
	};
} {
	const isNested = "metadata" in raw;
	const meta = isNested
		? (raw as NestedManifest).metadata
		: (raw as FlatManifest);
	const party = raw.party ?? {};

	return {
		slug: meta.slug,
		title: meta.title,
		description: meta.description,
		instructions: meta.instructions ?? "",
		brands: raw.brands ?? [],
		brandTitles: raw.brandTitles ?? {},
		party: {
			minPlayers: party.minPlayers ?? 3,
			maxPlayers: party.maxPlayers ?? 8,
			contentPacks: party.contentPacks ?? [],
			roundCount: party.roundCount ?? 1,
		},
	};
}

const ALL_MANIFESTS: RawManifest[] = [
	aboutYouBluffManifest as RawManifest,
	chainReactionManifest as RawManifest,
	chromaCluesManifest as RawManifest,
	consensusMineManifest as RawManifest,
	drawfulAnimateManifest as RawManifest,
	halfAndHalfManifest as RawManifest,
	headsUpManifest as RawManifest,
	lexiconLadderManifest as RawManifest,
	outOfContextManifest as RawManifest,
	percentPanicManifest as RawManifest,
	punchlineFerryManifest as RawManifest,
	quickfireQAManifest as RawManifest,
	quiplashManifest as RawManifest,
	rivalRosterManifest as RawManifest,
	roleReplayManifest as RawManifest,
	ruinAndRedeemManifest as RawManifest,
	shirtClashManifest as RawManifest,
	sketchBluffManifest as RawManifest,
	spectrumGuessManifest as RawManifest,
	truthTrapManifest as RawManifest,
	yearJinxManifest as RawManifest,
];

const TEMPLATES = ALL_MANIFESTS.map(normalizeManifest).filter((t) => t.slug);

export const partyTemplatesRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					brand: z.enum(["amen", "slopcade"]).optional(),
				})
				.optional(),
		)
		.query(({ input }) => {
			const brand = input?.brand;
			const templates = brand
				? TEMPLATES.filter((t) => t.brands.includes(brand))
				: TEMPLATES;

			return templates.map((t) => {
				const brandOverride = brand ? t.brandTitles[brand] : undefined;
				return {
					id: t.slug,
					title: brandOverride?.title ?? t.title,
					description: brandOverride?.description ?? t.description,
					instructions: t.instructions,
					minPlayers: t.party.minPlayers,
					maxPlayers: t.party.maxPlayers,
					roundCount: t.party.roundCount,
					brands: t.brands,
				};
			});
		}),

	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
				brand: z.enum(["amen", "slopcade"]).optional(),
			}),
		)
		.query(({ input }) => {
			const template = TEMPLATES.find((t) => t.slug === input.id);
			if (!template) return null;

			const brandOverride = input.brand
				? template.brandTitles[input.brand]
				: undefined;
			return {
				id: template.slug,
				title: brandOverride?.title ?? template.title,
				description: brandOverride?.description ?? template.description,
				instructions: template.instructions,
				minPlayers: template.party.minPlayers,
				maxPlayers: template.party.maxPlayers,
				roundCount: template.party.roundCount,
				brands: template.brands,
			};
		}),
});
