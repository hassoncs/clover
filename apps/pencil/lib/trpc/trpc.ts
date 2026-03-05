import type { AppRouter } from "@slopcade/api/trpc";
import { createTRPCReact } from "@trpc/react-query";

// Separate module so `trpc` is never in a circular require chain.
// Metro CJS bundles use Object.defineProperty getters for ESM exports —
// if this module is required mid-initialization due to a cycle, the getter
// would return `trpc` from its TDZ and throw ReferenceError.
// By isolating this call, it has no deps that could cycle back here.
export const trpc = createTRPCReact<AppRouter>();
