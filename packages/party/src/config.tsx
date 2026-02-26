import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export interface NarrationResult {
  assetId: string;
  url: string;
  contentType: string;
  durationSeconds: number | null;
}

export interface PartyConfig {
  getAuthToken: () => Promise<string | null>;
  apiUrl: string;
  getStorageItem: (key: string) => Promise<string | null>;
  setStorageItem: (key: string, value: string) => Promise<void>;
  resolveAssetUrl: (path: string) => string;
  generateNarration: (text: string, brand?: string, signal?: AbortSignal) => Promise<NarrationResult>;
}

const PartyConfigContext = createContext<PartyConfig | null>(null);

let runtimePartyConfig: PartyConfig | null = null;

export function PartyConfigProvider({
  config,
  children,
}: {
  config: PartyConfig;
  children: ReactNode;
}) {
  runtimePartyConfig = config;
  return <PartyConfigContext.Provider value={config}>{children}</PartyConfigContext.Provider>;
}

export function usePartyConfig(): PartyConfig {
  const config = useContext(PartyConfigContext);
  if (!config) {
    throw new Error("PartyConfigProvider is required above this component");
  }
  return config;
}

export function getPartyRuntimeConfig(): PartyConfig {
  if (!runtimePartyConfig) {
    throw new Error("PartyConfigProvider is required before using party runtime APIs");
  }
  return runtimePartyConfig;
}
