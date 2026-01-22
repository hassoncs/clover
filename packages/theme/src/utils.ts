import { tokens } from '@slopcade/theme';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function createThemeVariant<T extends Record<string, string>>(variants: T) {
  return variants;
}

export function spacing(value: keyof typeof tokens.spacing): string {
  return tokens.spacing[value];
}

export function color(path: string): string {
  const keys = path.split('.');
  let value: any = tokens.colors;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) return '';
  }
  
  return value as string;
}