import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Car",
  description: "Vehicle with motors and terrain.",
};

export default function Example() {
  return (
    <SkiaExample
      title="Car"
      getComponent={() => import("../../components/examples/Car")}
    />
  );
}
