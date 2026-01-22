import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: 'Effects Gallery',
  description: 'Interactive showcase of shader effects with live parameter controls',
};

export default function Example() {
  return (
    <SkiaExample
      title="Effects Gallery"
      getComponent={() => import("../../components/examples/EffectsGallery")}
    />
  );
}
