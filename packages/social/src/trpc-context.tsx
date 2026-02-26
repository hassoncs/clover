import { createContext, type ReactNode, useContext } from "react";

type AnyTRPCReact = {
	createClient: (...args: any[]) => unknown;
	useUtils: () => any;
	social: any;
	socialExtra: any;
	moderation: any;
};

const SocialTRPCContext = createContext<AnyTRPCReact | null>(null);

export function SocialProvider({
	trpc,
	children,
}: {
	trpc: AnyTRPCReact;
	children: ReactNode;
}) {
	return (
		<SocialTRPCContext.Provider value={trpc}>
			{children}
		</SocialTRPCContext.Provider>
	);
}

export function useSocialTRPC(): AnyTRPCReact {
	const trpc = useContext(SocialTRPCContext);
	if (!trpc) throw new Error("SocialProvider is required above this component");
	return trpc;
}
