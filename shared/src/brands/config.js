const AMEN_BRAND = {
    id: "amen",
    displayName: "Amen",
    domain: "amen.games",
    supportEmail: "support@amen.games",
    tagline: "Scripture. Fellowship. Fun.",
    colors: {
        primary: "#C9A84C",
        primaryLight: "#E8D5A0",
        accent: "#0A1833",
        background: "#0D1C33",
        surface: "#0F2347",
        border: "rgba(201, 168, 76, 0.3)",
        textPrimary: "#FFFDF7",
        textSecondary: "rgba(255, 253, 247, 0.5)",
    },
};
const SLOPCADE_BRAND = {
    id: "slopcade",
    displayName: "Slopcade",
    domain: "slopcade.com",
    supportEmail: "support@slopcade.com",
    tagline: "The Arcade",
    colors: {
        primary: "#6366F1",
        primaryLight: "#A5B4FC",
        accent: "#A855F7",
        background: "#0A0A1A",
        surface: "#1A1A2E",
        border: "rgba(99, 102, 241, 0.25)",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255, 255, 255, 0.5)",
    },
};
const SLOPBOX_BRAND = {
    id: "slopbox",
    displayName: "Slopbox",
    domain: "slopbox.tv",
    supportEmail: "support@slopbox.tv",
    tagline: "Party games. Pure chaos.",
    colors: {
        primary: "#F97316",
        primaryLight: "#FED7AA",
        accent: "#A855F7",
        background: "#0F0F0F",
        surface: "#1A1A1A",
        border: "rgba(249, 115, 22, 0.25)",
        textPrimary: "#F5F5F5",
        textSecondary: "#A3A3A3",
    },
};
const BRANDS = {
    amen: AMEN_BRAND,
    slopcade: SLOPCADE_BRAND,
    slopbox: SLOPBOX_BRAND,
};
export function getBrandConfig(brandId) {
    const config = BRANDS[brandId];
    if (!config) {
        throw new Error(`Unknown brand: "${brandId}". Available: ${Object.keys(BRANDS).join(", ")}`);
    }
    return config;
}
export function listBrandConfigs() {
    return Object.values(BRANDS);
}
//# sourceMappingURL=config.js.map