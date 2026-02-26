import React from 'react';
export default function Slider({ value, onValueChange, testID, ...props }) {
  return React.createElement('input', {
    type: 'range',
    value: value,
    onChange: (e) => onValueChange?.(parseFloat(e.target.value)),
    'data-testid': testID,
    ...props,
  });
}
