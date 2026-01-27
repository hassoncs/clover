export const DISPLAY_UNITS = {
  MICROS_PER_SPARK: 10_000,
  MICROS_PER_GEM: 100_000,
  SPARKS_PER_GEM: 10,
} as const;

export function microsToSparks(micros: number): number {
  return Math.floor(micros / DISPLAY_UNITS.MICROS_PER_SPARK);
}

export function sparksToMicros(sparks: number): number {
  return sparks * DISPLAY_UNITS.MICROS_PER_SPARK;
}

export function microsToUSD(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function formatSparks(micros: number): string {
  const sparks = microsToSparks(micros);
  return `${sparks.toLocaleString()} ⚡`;
}
