import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Falling Boxes (Box2D)",
  description: "Basic rigid bodies and colliders falling under gravity.",
};

export default function Box2DExample() {
  return (
    <SkiaExample
      title="Falling Boxes"
      getComponent={() => import("../../components/examples/FallingBoxes")}
    />
  );
}
