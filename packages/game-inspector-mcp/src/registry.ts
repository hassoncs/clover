import { existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_API_URL = "http://api.slopcade.localhost:1355";

function findProjectRoot(): string {
	let dir = __dirname;
	for (let i = 0; i < 10; i++) {
		if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "app"))) {
			return dir;
		}
		dir = dirname(dir);
	}
	throw new Error("Could not find project root");
}

const PROJECT_ROOT = findProjectRoot();

export interface GameInfo {
	id: string;
	slug: string;
	uuid: string;
	title: string;
	description: string | null;
	path: string;
	type: "game" | "example";
}

interface TRPCGameIndex {
	id: string;
	title: string;
	description: string | null;
	isPublic: boolean;
	playCount: number;
	version: string;
}

function gameFromAPI(g: TRPCGameIndex): GameInfo {
	return {
		id: g.id,
		slug: g.id,
		uuid: g.id,
		title: g.title,
		description: g.description,
		path: `/play/${g.id}`,
		type: "game",
	};
}

export function getApiUrl(): string {
	return process.env.SLOPCADE_API_URL ?? DEFAULT_API_URL;
}

async function fetchTRPC<T>(
	path: string,
	input?: unknown,
	auth?: string,
): Promise<T> {
	const apiUrl = getApiUrl();
	let url = `${apiUrl}/trpc/${path}`;
	if (input !== undefined) {
		url += `?input=${encodeURIComponent(JSON.stringify(input))}`;
	}
	const headers: Record<string, string> = {};
	if (auth) {
		headers.Authorization = `Bearer ${auth}`;
	}
	const res = await fetch(url, { headers });
	if (!res.ok) {
		throw new Error(`tRPC ${path} failed: ${res.status} ${res.statusText}`);
	}
	const body = (await res.json()) as { result: { data: T } };
	return body.result.data;
}

export async function fetchGamesFromAPI(): Promise<GameInfo[]> {
	const seen = new Set<string>();
	const games: GameInfo[] = [];

	try {
		const userGames = await fetchTRPC<TRPCGameIndex[]>(
			"games.list",
			undefined,
			"dev-token",
		);
		for (const g of userGames) {
			if (!seen.has(g.id)) {
				seen.add(g.id);
				games.push(gameFromAPI(g));
			}
		}
	} catch {}

	try {
		const publicGames = await fetchTRPC<TRPCGameIndex[]>("games.listPublic", {
			limit: 50,
			offset: 0,
			includeCritical: true,
		});
		for (const g of publicGames) {
			if (!seen.has(g.id)) {
				seen.add(g.id);
				games.push(gameFromAPI(g));
			}
		}
	} catch (err) {
		console.error(
			"[registry] Failed to fetch public games:",
			err instanceof Error ? err.message : String(err),
		);
	}

	return games.sort((a, b) => a.title.localeCompare(b.title));
}

export function discoverExamples(): GameInfo[] {
	const examplesDir = join(PROJECT_ROOT, "app/app/examples");

	if (!existsSync(examplesDir)) {
		console.error(`[registry] Examples directory not found: ${examplesDir}`);
		return [];
	}

	const entries = readdirSync(examplesDir, { withFileTypes: true });
	const examples: GameInfo[] = [];

	for (const entry of entries) {
		if (
			entry.isFile() &&
			entry.name.endsWith(".tsx") &&
			!entry.name.startsWith("_") &&
			!entry.name.startsWith("[")
		) {
			const id = entry.name.replace(".tsx", "");
			examples.push({
				id,
				slug: id,
				uuid: id,
				title: id,
				description: null,
				path: `/examples/${id}`,
				type: "example",
			});
		}
	}

	return examples.sort((a, b) => a.id.localeCompare(b.id));
}

export function getAvailableExamples(): GameInfo[] {
	return discoverExamples();
}

export async function getAvailableGames(): Promise<GameInfo[]> {
	return fetchGamesFromAPI();
}

export async function getAllAvailable(): Promise<GameInfo[]> {
	const [games, examples] = await Promise.all([
		getAvailableGames(),
		Promise.resolve(getAvailableExamples()),
	]);
	return [...games, ...examples];
}

export async function isValidGame(id: string): Promise<boolean> {
	const games = await getAvailableGames();
	return games.some((g) => g.id === id || g.uuid === id || g.slug === id);
}

export function isValidExample(id: string): boolean {
	return getAvailableExamples().some((e) => e.id === id);
}

export async function findByIdOrPath(
	input: string,
): Promise<GameInfo | undefined> {
	const all = await getAllAvailable();

	const byExact = all.find(
		(g) => g.id === input || g.uuid === input || g.slug === input,
	);
	if (byExact) return byExact;

	const normalizedInput = input.toLowerCase().replace(/[-_\s]/g, "");
	return all.find(
		(g) =>
			g.id.toLowerCase().replace(/[-_\s]/g, "") === normalizedInput ||
			g.title.toLowerCase().replace(/[-_\s]/g, "") === normalizedInput,
	);
}
