import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Interaction",
  description: "Touch to spawn and move objects.",
};

export default function InteractionExample() {
  return (
    <SkiaExample
      title="Interaction"
      getComponent={() => import("../../components/examples/Interaction")}
    />
  );
}
