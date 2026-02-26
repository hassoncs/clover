import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform, AppState, AppStateStatus } from "react-native";
import { env } from "../config/env";
import { largeSecureStore } from "../auth/storage";

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

let supabaseInstance: SupabaseClient | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not configured");
    return null;
  }

  const isWeb = Platform.OS === "web";

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
      storage: isWeb ? undefined : largeSecureStore,
    },
  });

  if (!isWeb) {
    appStateSubscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          client.auth.startAutoRefresh();
        } else {
          client.auth.stopAutoRefresh();
        }
      }
    );
  }

  return client;
}

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
})();

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase client not initialized - check credentials");
  }
  return supabase;
}

export function cleanupSupabase(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
