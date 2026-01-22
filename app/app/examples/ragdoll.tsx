import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Ragdoll Playground",
  description: "Complex revolute joints with limits and mass distribution.",
};

export default function RagdollExample() {
  return (
    <SkiaExample
      title="Ragdoll Playground"
      getComponent={() => import("../../components/examples/Ragdoll")}
    />
  );
}
