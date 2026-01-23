import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../api/src/trpc/router";
import { supabase } from "../supabase/client";
import { env } from "../config/env";

export const trpcReact = createTRPCReact<AppRouter>();

function getApiUrl(): string {
  return env.apiUrl;
}

async function getAuthToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            gcTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpcReact.createClient({
      links: [
        httpBatchLink({
          url: `${getApiUrl()}/trpc`,
          async headers() {
            const headers: Record<string, string> = {};

            const token = await getAuthToken();
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }

            return headers;
          },
        }),
      ],
    })
  );

  return (
    <trpcReact.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpcReact.Provider>
  );
}

export { QueryClient, QueryClientProvider };
