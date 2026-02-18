import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

if (!env.supabaseUrl || !env.supabaseAnonKey) {
	throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});
