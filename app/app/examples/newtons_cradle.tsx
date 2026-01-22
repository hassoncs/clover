import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Newton's Cradle",
  description: "Restitution and momentum conservation.",
};

export default function Example() {
  return (
    <SkiaExample
      title="Newtons Cradle"
      getComponent={() => import("../../components/examples/NewtonsCradle")}
    />
  );
}
