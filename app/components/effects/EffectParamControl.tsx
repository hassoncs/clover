import React from 'react';
import { View, Text, Switch, TextInput } from 'react-native';
import { TunableSlider } from '../game/TunableSlider';
import type { EffectParamSchema, ParamValue } from '@slopcade/shared';

interface EffectParamControlProps {
  schema: EffectParamSchema;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
}

export function EffectParamControl({ schema, value, onChange }: EffectParamControlProps) {
  const { type, ui } = schema;
  const label = ui?.displayName || schema.key;
  const description = ui?.description;

  const getNumber = (val: ParamValue): number => {
    if (typeof val === 'number') return val;
    return 0;
  };

  const getBool = (val: ParamValue): boolean => {
    if (typeof val === 'boolean') return val;
    return false;
  };

  const getString = (val: ParamValue): string => {
    if (typeof val === 'string') return val;
    return '';
  };

  const getArray = (val: ParamValue): number[] => {
    if (Array.isArray(val)) return val;
    return [];
  };

  if (type === 'float' || type === 'int') {
    return (
      <TunableSlider
        varKey={schema.key}
        label={label}
        description={description}
        currentValue={getNumber(value)}
        min={ui?.min ?? 0}
        max={ui?.max ?? 1}
        step={ui?.step ?? (type === 'int' ? 1 : 0.01)}
        onChange={onChange}
      />
    );
  }

  if (type === 'bool') {
    return (
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 mr-4">
          <Text className="text-white font-medium">{label}</Text>
          {description && <Text className="text-gray-500 text-xs">{description}</Text>}
        </View>
        <Switch
          value={getBool(value)}
          onValueChange={onChange}
          trackColor={{ false: '#374151', true: '#a855f7' }}
          thumbColor="#fff"
        />
      </View>
    );
  }

  if (type === 'color') {
    return (
      <View className="mb-4">
        <Text className="text-white font-medium mb-1">{label}</Text>
        {description && <Text className="text-gray-500 text-xs mb-2">{description}</Text>}
        <View className="flex-row items-center gap-2">
          <View 
            className="w-8 h-8 rounded border border-gray-600" 
            style={{ backgroundColor: getString(value) || '#000000' }} 
          />
          <TextInput
            className="flex-1 bg-gray-800 text-white p-2 rounded border border-gray-700 font-mono"
            value={getString(value)}
            onChangeText={onChange}
            placeholder="#RRGGBB"
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>
    );
  }

  if (type === 'vec2' || type === 'vec3' || type === 'vec4') {
    const components = type === 'vec2' ? ['x', 'y'] : type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w'];
    const currentValues = getArray(value);
    
    return (
      <View className="mb-4">
        <Text className="text-white font-medium mb-1">{label}</Text>
        {description && <Text className="text-gray-500 text-xs mb-2">{description}</Text>}
        <View className="flex-row gap-2">
          {components.map((comp, i) => (
            <View key={comp} className="flex-1">
              <Text className="text-gray-400 text-xs mb-1 uppercase text-center">{comp}</Text>
              <TextInput
                className="bg-gray-800 text-white p-2 rounded border border-gray-700 font-mono text-center"
                value={String(currentValues[i] ?? 0)}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const newValues = [...currentValues];
                  while (newValues.length <= i) newValues.push(0);
                  newValues[i] = parseFloat(text) || 0;
                  onChange(newValues);
                }}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return null;
}
