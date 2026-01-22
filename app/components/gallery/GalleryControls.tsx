
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { ParamDefinition } from '@slopcade/shared';

type GalleryControlsProps = {
  params: ParamDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

const NumberControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: number;
  onChange: (value: number) => void;
}) => {
  const step = param.step ?? 1;
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{param.displayName}</Text>
      <View style={styles.numberInput}>
        <Pressable onPress={() => onChange(value - step)} style={styles.numberButton}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.numberValue}>{value.toFixed(2)}</Text>
        <Pressable onPress={() => onChange(value + step)} style={styles.numberButton}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const BooleanControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <View style={styles.controlRow}>
    <Text style={styles.controlLabel}>{param.displayName}</Text>
    <Pressable onPress={() => onChange(!value)} style={[styles.toggleButton, value && styles.toggleButtonActive]}>
      <Text style={styles.buttonText}>{value ? 'On' : 'Off'}</Text>
    </Pressable>
  </View>
);

const ColorControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: string;
  onChange: (value: string) => void;
}) => {
  // A real implementation would use a color picker
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const currentIndex = colors.indexOf(value);
  const nextIndex = (currentIndex + 1) % colors.length;
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{param.displayName}</Text>
      <Pressable onPress={() => onChange(colors[nextIndex])}>
        <View style={[styles.colorSwatch, { backgroundColor: value }]} />
      </Pressable>
    </View>
  );
};

const SelectControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: string;
  onChange: (value: string) => void;
}) => {
  const options = param.options ?? [];
  const currentIndex = options.indexOf(value);
  const nextIndex = (currentIndex + 1) % options.length;
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{param.displayName}</Text>
      <Pressable onPress={() => onChange(options[nextIndex])} style={styles.selectButton}>
        <Text style={styles.buttonText}>{value}</Text>
      </Pressable>
    </View>
  );
};

export const GalleryControls = ({ params, values, onChange }: GalleryControlsProps) => {
  return (
    <View style={styles.container}>
      {params.map(param => {
        const value = values[param.key];
        switch (param.type) {
          case 'number':
            return (
              <NumberControl
                key={param.key}
                param={param}
                value={value as number}
                onChange={newValue => onChange(param.key, newValue)}
              />
            );
          case 'boolean':
            return (
              <BooleanControl
                key={param.key}
                param={param}
                value={value as boolean}
                onChange={newValue => onChange(param.key, newValue)}
              />
            );
          case 'color':
            return (
              <ColorControl
                key={param.key}
                param={param}
                value={value as string}
                onChange={newValue => onChange(param.key, newValue)}
              />
            );
          case 'select':
            return (
              <SelectControl
                key={param.key}
                param={param}
                value={value as string}
                onChange={newValue => onChange(param.key, newValue)}
              />
            );
          default:
            return null;
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 16,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberButton: {
    width: 30,
    height: 30,
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  numberValue: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 16,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#4ecdc4',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
  },
});
