import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Slingshot",
  description: "Drag-and-release mechanics with impulse physics.",
};

export default function SlingshotExample() {
  return (
    <SkiaExample
      title="Slingshot"
      getComponent={() => import("../../components/examples/Slingshot")}
    />
  );
}
