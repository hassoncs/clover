import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Parallax Background",
  description: "Multi-layer parallax with 4 themes and camera controls.",
};

export default function ParallaxDemoExample() {
  return (
    <SkiaExample
      title="Parallax Background Demo"
      getComponent={() => import("../../components/examples/ParallaxDemo")}
    />
  );
}
