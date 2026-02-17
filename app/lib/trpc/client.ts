import type { AppRouter } from "@slopcade/api/trpc";
import { createTRPCClient, httpLink } from "@trpc/client";
import { env } from "../config/env";
import { getTrpcHeaders } from "./headers";

function getApiUrl(): string {
	return env.apiUrl;
}

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: `${getApiUrl()}/trpc`,
			headers: getTrpcHeaders,
		}),
	],
});

export { getApiUrl };
