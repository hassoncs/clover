import { trpcReact } from "@/lib/trpc/react";

export function useBrowsePartyGames() {
	const query = trpcReact.partyTemplates.listByBrand.useQuery({
		brandId: "amen",
	});

	return {
		templates: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	};
}
