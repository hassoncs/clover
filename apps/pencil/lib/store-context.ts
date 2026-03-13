import type {
	PencilDocumentStore,
	PencilHostAdapter,
} from "@slopcade/pencil-core/contracts";
import {
	createContext,
	createElement,
	type ReactNode,
	useContext,
	useMemo,
} from "react";
import { createSlopcadeHostAdapter } from "./adapters/slopcade-store-adapter";
import { getConfiguredLegacyWorkspaceId } from "./pencilEmbed";
import { usePencilTrpcClient } from "./trpc/client";

const PencilStoreContext = createContext<PencilDocumentStore | null>(null);
const PencilHostAdapterContext = createContext<PencilHostAdapter | null>(null);

export function PencilStoreProvider({
	children,
	store = null,
	hostAdapter,
}: {
	children: ReactNode;
	store?: PencilDocumentStore | null;
	hostAdapter?: PencilHostAdapter | null;
}) {
	const trpcClient = usePencilTrpcClient();
	const resolvedHostAdapter = useMemo(() => {
		if (hostAdapter !== undefined) return hostAdapter;
		if (!trpcClient) return null;
		return createSlopcadeHostAdapter(
			trpcClient,
			getConfiguredLegacyWorkspaceId(),
		);
	}, [hostAdapter, trpcClient]);
	const resolvedStore = store ?? resolvedHostAdapter?.getDocumentStore() ?? null;

	return createElement(
		PencilHostAdapterContext.Provider,
		{ value: resolvedHostAdapter },
		createElement(PencilStoreContext.Provider, { value: resolvedStore }, children),
	);
}

export function usePencilStore(): PencilDocumentStore | null {
	return useContext(PencilStoreContext);
}

export function usePencilHostAdapter(): PencilHostAdapter | null {
	return useContext(PencilHostAdapterContext);
}
