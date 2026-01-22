import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  Group,
  Fill,
  useClock,
} from '@shopify/react-native-skia';
import {
  EFFECT_METADATA,
  type EffectType,
  type EffectSpec,
} from '@slopcade/shared';
import { ShaderEffect } from '@/lib/effects/ShaderEffect';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 300;

const EFFECT_TYPES: EffectType[] = [
  'glow',
  'holographic',
  'vignette',
  'scanlines',
  'pixelate',
  'dissolve',
  'waveDistortion',
  'chromaticAberration',
  'tint',
  'blur',
  'posterize',
];

type EffectParams = Record<string, number | boolean | string>;

function getDefaultParams(type: EffectType): EffectParams {
  const meta = EFFECT_METADATA[type];
  const params: EffectParams = {};
  for (const param of meta.params) {
    params[param.key] = param.defaultValue;
  }
  return params;
}

export default function EffectsGallery() {
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('glow');
  const [params, setParams] = useState<EffectParams>(() => getDefaultParams('glow'));

  const handleEffectChange = useCallback((type: EffectType) => {
    setSelectedEffect(type);
    setParams(getDefaultParams(type));
  }, []);

  const handleParamChange = useCallback((key: string, value: number | boolean | string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const effectSpec = useMemo((): EffectSpec => {
    return { type: selectedEffect, ...params } as EffectSpec;
  }, [selectedEffect, params]);

  const meta = EFFECT_METADATA[selectedEffect];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.effectSelector}
        contentContainerStyle={styles.effectSelectorContent}
      >
        {EFFECT_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => handleEffectChange(type)}
            style={[
              styles.effectButton,
              selectedEffect === type && styles.effectButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.effectButtonText,
                selectedEffect === type && styles.effectButtonTextSelected,
              ]}
            >
              {EFFECT_METADATA[type].displayName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.previewContainer}>
        <EffectPreview effect={effectSpec} />
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.effectTitle}>{meta.displayName}</Text>
        <Text style={styles.effectDescription}>{meta.description}</Text>

        <ScrollView style={styles.paramsScroll}>
          {meta.params.map((paramMeta) => (
            <View key={paramMeta.key} style={styles.paramRow}>
              <Text style={styles.paramLabel}>{paramMeta.displayName}</Text>
              
              {paramMeta.type === 'number' && (
                <View style={styles.sliderContainer}>
                  <View style={styles.numberInputRow}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        const step = paramMeta.step ?? 0.1;
                        const newVal = Math.max(
                          paramMeta.min ?? 0,
                          (params[paramMeta.key] as number) - step
                        );
                        handleParamChange(paramMeta.key, newVal);
                      }}
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.paramValue}>
                      {(params[paramMeta.key] as number).toFixed(2)}
                    </Text>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => {
                        const step = paramMeta.step ?? 0.1;
                        const newVal = Math.min(
                          paramMeta.max ?? 1,
                          (params[paramMeta.key] as number) + step
                        );
                        handleParamChange(paramMeta.key, newVal);
                      }}
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {paramMeta.type === 'boolean' && (
                <Pressable
                  onPress={() =>
                    handleParamChange(paramMeta.key, !params[paramMeta.key])
                  }
                  style={[
                    styles.toggleButton,
                    params[paramMeta.key] ? styles.toggleButtonActive : null,
                  ]}
                >
                  <Text style={styles.toggleButtonText}>
                    {params[paramMeta.key] ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>
              )}

              {paramMeta.type === 'color' && (
                <View style={styles.colorPicker}>
                  {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map(
                    (color) => (
                      <Pressable
                        key={color}
                        onPress={() => handleParamChange(paramMeta.key, color)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color },
                          params[paramMeta.key] === color && styles.colorSwatchSelected,
                        ]}
                      />
                    )
                  )}
                </View>
              )}

              {paramMeta.type === 'select' && (
                <View style={styles.selectContainer}>
                  {paramMeta.options?.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => handleParamChange(paramMeta.key, option)}
                      style={[
                        styles.selectOption,
                        params[paramMeta.key] === option && styles.selectOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          params[paramMeta.key] === option &&
                            styles.selectOptionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

interface EffectPreviewProps {
  effect: EffectSpec;
}

function EffectPreview({ effect }: EffectPreviewProps) {
  const clock = useClock();

  const content = (
    <Group>
      <Rect x={50} y={50} width={80} height={80} color="#ff6b6b" />
      <Circle cx={200} cy={100} r={50} color="#4ecdc4" />
      <Rect x={120} y={180} width={100} height={70} color="#ffe66d" />
      <Circle cx={80} cy={220} r={35} color="#a8dadc" />
    </Group>
  );

  return (
    <Canvas style={styles.canvas}>
      <Fill color="#1a1a2e" />
      <ShaderEffect
        effect={effect}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        clock={clock}
      >
        {content}
      </ShaderEffect>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  effectSelector: {
    maxHeight: 50,
    backgroundColor: '#1a1a1a',
  },
  effectSelectorContent: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  effectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  effectButtonSelected: {
    backgroundColor: '#4ecdc4',
  },
  effectButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  effectButtonTextSelected: {
    color: '#000',
  },
  previewContainer: {
    alignItems: 'center',
    padding: 20,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  controlsContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  effectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  effectDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  paramsScroll: {
    flex: 1,
  },
  paramRow: {
    marginBottom: 20,
  },
  paramLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    color: '#4ecdc4',
    fontSize: 24,
    fontWeight: '600',
  },
  paramValue: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#4ecdc4',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#fff',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
  },
  selectOptionSelected: {
    backgroundColor: '#4ecdc4',
  },
  selectOptionText: {
    color: '#888',
    fontSize: 14,
  },
  selectOptionTextSelected: {
    color: '#000',
  },
});
