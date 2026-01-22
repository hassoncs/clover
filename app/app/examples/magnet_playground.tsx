import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Magnet Playground",
  description: "Custom force application with attract/repel polarity.",
};

export default function MagnetPlaygroundExample() {
  return (
    <SkiaExample
      title="Magnet Playground"
      getComponent={() => import("../../components/examples/MagnetPlayground")}
    />
  );
}
