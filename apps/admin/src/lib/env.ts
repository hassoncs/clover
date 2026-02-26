function resolveApiUrl(): string {
	if (import.meta.env.VITE_API_URL)
		return import.meta.env.VITE_API_URL as string;
	if (import.meta.env.DEV) {
		return "http://api.slopcade.localhost:1355";
	}
	return "https://api.slopcade.com";
}

export const env = {
	supabaseUrl: import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
	supabaseAnonKey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as
		| string
		| undefined,
	apiUrl: resolveApiUrl(),
};
