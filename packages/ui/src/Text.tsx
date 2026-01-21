import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/cn';

const textVariants = cva('text-text-primary', {
  variants: {
    variant: {
      default: 'text-base',
      h1: 'text-4xl font-bold tracking-tight',
      h2: 'text-3xl font-semibold tracking-tight',
      h3: 'text-2xl font-semibold tracking-tight',
      h4: 'text-xl font-semibold tracking-tight',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-text-secondary',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    variant: 'default',
    align: 'left',
  },
});

export interface TextProps
  extends RNTextProps,
    VariantProps<typeof textVariants> {}

const Text = React.forwardRef<RNText, TextProps>(
  ({ className, variant, align, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants({ variant, align, className }))}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text, textVariants };
