import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: 'Particle Playground',
  description: 'Interactive particle system with 10 presets and live controls',
};

export default function Example() {
  return (
    <SkiaExample
      title="Particle Playground"
      getComponent={() => import("../../components/examples/ParticlePlayground")}
    />
  );
}
