import * as React from 'react';
import { Pressable, type PressableProps, View, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/cn';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white active:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground active:opacity-90',
        outline:
          'border border-input bg-background active:bg-accent active:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground active:opacity-80',
        ghost: 'active:bg-accent active:text-accent-foreground',
        link: 'text-primary underline-offset-4 active:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-white',
      destructive: 'text-white',
      outline: 'text-text-primary',
      secondary: 'text-secondary-foreground',
      ghost: 'text-text-primary',
      link: 'text-primary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
  label?: string;
}

const Button = React.forwardRef<View, ButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {label ? (
          <Text className={cn(buttonTextVariants({ variant }))}>{label}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
