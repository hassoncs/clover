import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Avalanche",
  description: "Stress test with 150+ bodies.",
};

export default function Example() {
  return (
    <SkiaExample
      title="Avalanche"
      getComponent={() => import("../../components/examples/Avalanche")}
    />
  );
}
