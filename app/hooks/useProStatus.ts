import { Platform } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

export interface ProStatus {
	isPro: boolean;
	proUntil: number | null;
	source: "stripe" | "revenuecat" | "org" | null;
	hasStripeCustomer: boolean;
	isLoading: boolean;
}

export function useProStatus(): ProStatus {
	const { data, isLoading } = trpcReact.billing.getSubscriptionStatus.useQuery(
		undefined,
		{
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	);

	return {
		isPro: data?.isPro ?? false,
		proUntil: data?.proUntil ?? null,
		source: data?.source ?? null,
		hasStripeCustomer: data?.hasStripeCustomer ?? false,
		isLoading,
	};
}

export function useIsWeb(): boolean {
	return Platform.OS === "web";
}
