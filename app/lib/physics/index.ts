// Re-export from native for TypeScript type checking
// Metro will resolve to .native.ts or .web.ts at runtime
export { initPhysics } from "./Physics.native";
export * from "./types";
