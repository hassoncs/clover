import type { AppRouter } from "@slopcade/api/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type ReactNode, useState } from "react";
import { env } from "../config/env";
import { getTrpcHeaders } from "./headers";

export const trpcReact = createTRPCReact<AppRouter>();

function getApiUrl(): string {
	return env.apiUrl;
}

export function TRPCProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60,
						gcTime: 1000 * 60 * 5,
						retry: 1,
						refetchOnWindowFocus: false,
					},
					mutations: {
						retry: 0,
					},
				},
			}),
	);

	const [trpcClient] = useState(() =>
		trpcReact.createClient({
			links: [
				httpBatchLink({
					url: `${getApiUrl()}/trpc`,
					headers: getTrpcHeaders,
				}),
			],
		}),
	);

	return (
		<trpcReact.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpcReact.Provider>
	);
}

export { QueryClient, QueryClientProvider };
