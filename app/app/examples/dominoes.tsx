import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Dominoes",
  description: "Stacking stability and chain reaction.",
};

export default function Example() {
  return (
    <SkiaExample
      title="Dominoes"
      getComponent={() => import("../../components/examples/Dominoes")}
    />
  );
}
