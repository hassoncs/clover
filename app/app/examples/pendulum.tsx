import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Pendulum (Joints)",
  description: "Revolute joints and chain physics.",
};

export default function PendulumExample() {
  return (
    <SkiaExample
      title="Pendulum"
      getComponent={() => import("../../components/examples/Pendulum")}
    />
  );
}
