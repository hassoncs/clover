import type { PartyTemplate } from "@slopcade/party";
import { trpcReact } from "@/lib/trpc/react";

export function useBrowsePartyGames() {
	const query = trpcReact.partyTemplates.listByBrand.useQuery({
		brandId: "amen",
	});

	return {
		templates: (query.data ?? []) as PartyTemplate[],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	};
}
