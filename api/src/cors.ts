const ALLOWED_ORIGINS = new Set<string>([
	"http://localhost:8085",
	"http://localhost:8086",
	"http://localhost:8087",
	"http://localhost:8088",
	"http://localhost:8089",
	"http://127.0.0.1:8085",
	"http://127.0.0.1:8086",
	"http://127.0.0.1:8087",
	"http://127.0.0.1:8088",
	"http://127.0.0.1:8089",
	"https://slopcade.app",
	"https://www.slopcade.app",
	"https://slopcade.com",
	"https://www.slopcade.com",
	"https://app.slopcade.com",
	"https://amen.games",
	"https://www.amen.games",
	"https://app.amen.games",
	"https://slopcade-api.hassoncs.workers.dev",
]);

export function resolveCorsOrigin(
	origin: string | undefined,
): string | undefined {
	if (!origin) return origin;
	if (ALLOWED_ORIGINS.has(origin)) return origin;
	if (origin.endsWith(".slopcade.app")) return origin;
	if (origin.endsWith(".slopcade.com")) return origin;
	if (origin.endsWith(".amen.games")) return origin;
	if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
		return origin;
	}
	if (origin.match(/\.localhost(:\d+)?$/)) return origin;
	return undefined;
}
