import type { AppRouter } from "@slopcade/api/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type ReactNode, useState } from "react";
import { env } from "../env";

export const trpc = createTRPCReact<AppRouter>();

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
		trpc.createClient({
			links: [
				httpLink({
					url: `${env.apiUrl}/trpc`,
					headers: () => ({
						Authorization: __DEV__ ? "Bearer dev-token" : "",
						"x-brand-id": "pencil",
					}),
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
