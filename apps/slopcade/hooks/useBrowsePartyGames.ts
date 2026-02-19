import type { PartyTemplate } from "@/lib/party/template-types";
import { trpcReact } from "@/lib/trpc/react";

export function useBrowsePartyGames() {
	const query = trpcReact.partyTemplates.listByBrand.useQuery({
		brandId: "slopcade",
	});

	return {
		templates: (query.data ?? []) as PartyTemplate[],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	};
}
