import type { BrandConfig } from "@slopcade/shared";
import { createContext, type ReactNode, useContext } from "react";

const BrandContext = createContext<BrandConfig | null>(null);

interface BrandProviderProps {
	config: BrandConfig;
	children: ReactNode;
}

export function BrandProvider({ config, children }: BrandProviderProps) {
	return (
		<BrandContext.Provider value={config}>{children}</BrandContext.Provider>
	);
}

export function useBrandConfig(): BrandConfig {
	const config = useContext(BrandContext);
	if (!config) {
		throw new Error("useBrandConfig must be used within a BrandProvider");
	}
	return config;
}
