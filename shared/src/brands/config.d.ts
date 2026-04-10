export interface BrandConfig {
    id: string;
    displayName: string;
    domain: string;
    supportEmail: string;
    tagline: string;
    colors: {
        primary: string;
        primaryLight: string;
        accent: string;
        background: string;
        surface: string;
        border: string;
        textPrimary: string;
        textSecondary: string;
    };
}
export declare function getBrandConfig(brandId: string): BrandConfig;
export declare function listBrandConfigs(): BrandConfig[];
//# sourceMappingURL=config.d.ts.map