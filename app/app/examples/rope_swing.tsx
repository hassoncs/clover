import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Rope Swing",
  description: "Dynamic distance joints for spider-man style swinging.",
};

export default function RopeSwingExample() {
  return (
    <SkiaExample
      title="Rope Swing"
      getComponent={() => import("../../components/examples/RopeSwing")}
    />
  );
}
