import type { AppRouter } from "@slopcade/api/trpc";
import { createTRPCClient, httpLink } from "@trpc/client";
import { getAuthToken } from "@/lib/auth/token";
import { activeBrand } from "@/lib/brand";
import { env } from "../config/env";

function getApiUrl(): string {
	return env.apiUrl;
}

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: `${getApiUrl()}/trpc`,
			async headers() {
				const headers: Record<string, string> = {
					"x-brand-id": activeBrand.id,
				};

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
