export const env = {
	supabaseUrl: import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
	supabaseAnonKey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
	apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8789",
};
