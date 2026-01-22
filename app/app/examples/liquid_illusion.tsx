import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Liquid Illusion",
  description: "200+ particles simulating fluid with gravity tilting.",
};

export default function LiquidIllusionExample() {
  return (
    <SkiaExample
      title="Liquid Illusion"
      getComponent={() => import("../../components/examples/LiquidIllusion")}
    />
  );
}
