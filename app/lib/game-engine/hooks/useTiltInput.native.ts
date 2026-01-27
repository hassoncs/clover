import { useEffect, useRef, useCallback } from "react";
import { Accelerometer, type AccelerometerMeasurement } from "expo-sensors";

interface TiltData {
  x: number;
  y: number;
}

interface UseTiltInputOptions {
  enabled: boolean;
  sensitivity?: number;
  updateInterval?: number;
}

export function useTiltInput(
  options: UseTiltInputOptions,
  onTiltUpdate: (tilt: TiltData) => void
) {
  const { enabled, sensitivity = 1, updateInterval = 50 } = options;
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  const handleUpdate = useCallback(
    (data: AccelerometerMeasurement) => {
      const normalizedX = Math.max(-1, Math.min(1, data.x * sensitivity));
      const normalizedY = Math.max(-1, Math.min(1, data.y * sensitivity));
      onTiltUpdate({ x: normalizedX, y: normalizedY });
    },
    [sensitivity, onTiltUpdate]
  );

  useEffect(() => {
    if (!enabled) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      return;
    }

    Accelerometer.setUpdateInterval(updateInterval);
    subscriptionRef.current = Accelerometer.addListener(handleUpdate);
    console.log("[TiltInput] Started accelerometer");

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
        console.log("[TiltInput] Stopped accelerometer");
      }
    };
  }, [enabled, updateInterval, handleUpdate]);
}
