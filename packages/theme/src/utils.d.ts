import { tokens } from './tokens';
export declare function cn(...classes: (string | undefined | null | false)[]): string;
export declare function createThemeVariant<T extends Record<string, string>>(variants: T): T;
export declare function spacing(value: keyof typeof tokens.spacing): string;
export declare function color(path: string): string;
//# sourceMappingURL=utils.d.ts.map