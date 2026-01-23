import { SkiaExample } from "../../components/SkiaExample";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "BLE Physics Sync",
  description: "Multiplayer physics sync over Bluetooth Low Energy. Host broadcasts, clients receive and can interact.",
};

export default function BLEPhysicsSyncPage() {
  return (
    <SkiaExample
      title="BLE Physics Sync"
      getComponent={() => import("../../components/examples/BLEPhysicsSync")}
    />
  );
}
