import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from './lib/cn';

export interface BoxProps extends ViewProps {
  className?: string;
}

const Box = React.forwardRef<View, BoxProps>(
  ({ className, ...props }, ref) => {
    return <View ref={ref} className={cn(className)} {...props} />;
  }
);
Box.displayName = 'Box';

export { Box };
