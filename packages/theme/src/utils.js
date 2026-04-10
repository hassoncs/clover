import { tokens } from './tokens';
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
export function createThemeVariant(variants) {
    return variants;
}
export function spacing(value) {
    return tokens.spacing[value];
}
export function color(path) {
    const keys = path.split('.');
    let value = tokens.colors;
    for (const key of keys) {
        value = value[key];
        if (value === undefined)
            return '';
    }
    return value;
}
//# sourceMappingURL=utils.js.map