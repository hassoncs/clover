import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AnyRouter } from "@trpc/server";
import { createContext, type ReactNode, useContext, useState } from "react";
import { env } from "../env";

export const trpc = createTRPCReact<AnyRouter>() as any;

function createPencilTrpcClient() {
	return trpc.createClient({
		links: [
			httpLink({
				url: `${env.apiUrl}/trpc`,
				headers: () => ({
					Authorization: __DEV__ ? "Bearer dev-token" : "",
					"x-brand-id": "pencil",
				}),
			}),
		],
	});
}

export type PencilTrpcClient = ReturnType<typeof createPencilTrpcClient>;

const PencilTrpcClientContext = createContext<PencilTrpcClient | null>(null);

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

	const [trpcClient] = useState(createPencilTrpcClient);

	return (
		<PencilTrpcClientContext.Provider value={trpcClient}>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</trpc.Provider>
		</PencilTrpcClientContext.Provider>
	);
}

export function usePencilTrpcClient(): PencilTrpcClient | null {
	return useContext(PencilTrpcClientContext);
}
