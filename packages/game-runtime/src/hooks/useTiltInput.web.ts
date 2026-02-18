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
  _options: UseTiltInputOptions,
  _onTiltUpdate: (tilt: TiltData) => void
) {
  // No-op on web - accelerometer not available
}
