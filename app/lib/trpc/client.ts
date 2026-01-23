import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/trpc/router";
import { supabase } from "../supabase/client";
import { env } from "../config/env";

function getApiUrl(): string {
  return env.apiUrl;
}

async function getAuthToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
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
