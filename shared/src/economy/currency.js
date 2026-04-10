export const DISPLAY_UNITS = {
    MICROS_PER_SPARK: 10_000,
    MICROS_PER_GEM: 100_000,
    SPARKS_PER_GEM: 10,
};
export function microsToSparks(micros) {
    return Math.floor(micros / DISPLAY_UNITS.MICROS_PER_SPARK);
}
export function sparksToMicros(sparks) {
    return sparks * DISPLAY_UNITS.MICROS_PER_SPARK;
}
export function microsToUSD(micros) {
    return `$${(micros / 1_000_000).toFixed(2)}`;
}
export function formatSparks(micros) {
    const sparks = microsToSparks(micros);
    return `${sparks.toLocaleString()} ⚡`;
}
//# sourceMappingURL=currency.js.map