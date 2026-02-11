import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@slopcade/api/trpc";
import { env } from "../config/env";
import { getAuthToken } from '@/lib/auth/token';

function getApiUrl(): string {
  return env.apiUrl;
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
