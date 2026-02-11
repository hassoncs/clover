import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@slopcade/api/trpc";
import { supabase } from "../supabase/client";
import { env } from "../config/env";
import { getStorageItem } from '@/lib/utils/storage';

function getApiUrl(): string {
  return env.apiUrl;
}

async function getAuthToken(): Promise<string | null> {
  if (__DEV__) {
    const useDevUser = await getStorageItem('use_dev_user', false);
    if (useDevUser) return 'dev-token';
  }
  
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    } catch { }
  }
  if (__DEV__) return 'dev-token';
  return null;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${getApiUrl()}/trpc`,
      async headers() {
        const headers: Record<string, string> = {};

        const token = await getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
      },
    }),
  ],
});

export { getApiUrl };
