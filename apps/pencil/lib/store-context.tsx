import type { AppRouter } from "@slopcade/api/trpc";
import type { PencilDocumentStore } from "@slopcade/pencil-core/contracts";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { SlopcadeDocumentStore } from "./adapters/slopcade-store-adapter";
import { env } from "./env";

const PencilStoreContext = createContext<PencilDocumentStore | null>(null);

export function usePencilStore(): PencilDocumentStore | null {
	return useContext(PencilStoreContext);
}

export function PencilStoreProvider({ children }: { children: ReactNode }) {
	const store = useMemo(() => {
		const client = createTRPCProxyClient<AppRouter>({
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
		return new SlopcadeDocumentStore(client);
	}, []);

	return (
		<PencilStoreContext.Provider value={store}>
			{children}
		</PencilStoreContext.Provider>
	);
}

export { PencilStoreContext };
