import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Top-Down Asteroids",
  description: "Zero gravity, angular impulse, and screen wrapping.",
};

export default function TopDownAsteroidsExample() {
  return (
    <SkiaExample
      title="Top-Down Asteroids"
      getComponent={() => import("../../components/examples/TopDownAsteroids")}
    />
  );
}
