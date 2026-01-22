import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/trpc/router";
import { supabase } from "../supabase/client";
import { env } from "../config/env";
import { getInstallId, getInstallIdAsync } from "./installId";

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
        const installId = await getInstallIdAsync();
        console.log('[tRPC] Setting headers with installId:', installId);
        const headers: Record<string, string> = {
          "X-Install-Id": installId,
        };

        const token = await getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        console.log('[tRPC] Headers:', headers);
        console.log('[tRPC] API URL:', `${getApiUrl()}/trpc`);
        return headers;
      },
      fetch(url, options) {
        console.log('[tRPC] Fetching:', url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('[tRPC] Request timeout after 10s');
          controller.abort();
        }, 10000);

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    }),
  ],
});

export { getInstallId, getInstallIdAsync, getApiUrl };
