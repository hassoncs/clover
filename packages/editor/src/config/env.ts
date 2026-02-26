function resolveApiUrl(): string {
	if (typeof window === "undefined" || !window.location) {
		return "http://api.slopcade.localhost:1355";
	}
	const host = window.location.host;
	if (host.includes("slopcade.localhost")) {
		return `${window.location.protocol}//api.slopcade.localhost:1355`;
	}
	return `${window.location.protocol}//${window.location.host}`;
}

export const env = {
	apiUrl: resolveApiUrl(),
};

export function resolveAssetUrl(url?: string | null): string | undefined {
	if (!url) {
		return undefined;
	}
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}
	const normalized = url.startsWith("/") ? url : `/${url}`;
	return `${env.apiUrl}${normalized}`;
}
