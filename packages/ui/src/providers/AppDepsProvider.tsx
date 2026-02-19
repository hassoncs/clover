import { createContext, type ReactNode, useContext } from "react";

export interface AppDeps {
	trpc: {
		useQuery: (path: string[], opts?: unknown) => unknown;
		useMutation: (path: string[]) => unknown;
	};
	env: {
		apiUrl: string;
		resolveAssetUrl: (path: string) => string | undefined;
	};
	toast: {
		subscribe: (listener: () => void) => () => void;
		isRequested: () => boolean;
	};
}

const AppDepsContext = createContext<AppDeps | null>(null);

export function AppDepsProvider({
	deps,
	children,
}: {
	deps: AppDeps;
	children: ReactNode;
}) {
	return (
		<AppDepsContext.Provider value={deps}>{children}</AppDepsContext.Provider>
	);
}

export function useAppDeps(): AppDeps {
	const deps = useContext(AppDepsContext);
	if (!deps) throw new Error("useAppDeps must be used within AppDepsProvider");
	return deps;
}
