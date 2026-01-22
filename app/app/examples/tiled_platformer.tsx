import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Tiled Platformer",
  description: "Platformer level using tile maps with collision physics and parallax",
};

export default function TiledPlatformerExample() {
  return (
    <SkiaExample
      title="Tiled Platformer"
      getComponent={() => import("../../components/examples/TiledPlatformer")}
    />
  );
}
