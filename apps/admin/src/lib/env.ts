function resolveApiUrl(): string {
	if (import.meta.env.VITE_API_URL)
		return import.meta.env.VITE_API_URL as string;
	if (typeof window !== "undefined") {
		const { hostname, port } = window.location;
		if (hostname.endsWith(".slopcade.localhost")) {
			return `http://api.slopcade.localhost${port ? `:${port}` : ""}`;
		}
	}
	return "http://localhost:8789";
}

export const env = {
	supabaseUrl: import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
	supabaseAnonKey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as
		| string
		| undefined,
	apiUrl: resolveApiUrl(),
};
