import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Pinball Table",
  description: "High restitution, kinematic flippers, and collision scoring.",
};

export default function PinballExample() {
  return (
    <SkiaExample
      title="Pinball Table"
      getComponent={() => import("../../components/examples/Pinball")}
    />
  );
}
