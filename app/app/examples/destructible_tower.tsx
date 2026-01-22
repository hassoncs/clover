import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Destructible Tower",
  description: "Runtime body destruction and debris spawning.",
};

export default function DestructibleTowerExample() {
  return (
    <SkiaExample
      title="Destructible Tower"
      getComponent={() => import("../../components/examples/DestructibleTower")}
    />
  );
}
