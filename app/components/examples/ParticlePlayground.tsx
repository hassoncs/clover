import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Canvas, Fill, Group } from '@shopify/react-native-skia';
import {
  PARTICLE_PRESETS,
  PARTICLE_EMITTER_METADATA,
  type ParticleEmitterType,
  type ParticleEmitterConfig,
  type ParticlePoolState,
} from '@slopcade/shared';
import {
  createParticlePool,
  updateParticles,
  triggerBurst,
  resetParticles,
} from '@/lib/particles/ParticleSystem';
import { ParticleSystemRenderer } from '@/lib/particles/ParticleRenderer';

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 400;

export default function ParticlePlayground() {
  const [selectedType, setSelectedType] = useState<ParticleEmitterType>('fire');
  const [emissionRate, setEmissionRate] = useState(80);
  const [lifetimeMin, setLifetimeMin] = useState(0.5);
  const [lifetimeMax, setLifetimeMax] = useState(1.2);
  const [speedMin, setSpeedMin] = useState(50);
  const [speedMax, setSpeedMax] = useState(100);
  const [gravityY, setGravityY] = useState(-20);
  const [particleSize, setParticleSize] = useState(12);
  
  const poolRef = useRef<ParticlePoolState | null>(null);
  const configRef = useRef<ParticleEmitterConfig | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const [, forceUpdate] = useState({});

  const emitterX = CANVAS_WIDTH / 2;
  const emitterY = CANVAS_HEIGHT - 50;

  useEffect(() => {
    const preset = PARTICLE_PRESETS[selectedType];
    poolRef.current = createParticlePool(preset?.maxParticles ?? 200);
    
    setEmissionRate(preset?.emissionRate ?? 80);
    setLifetimeMin(preset?.lifetime?.min ?? 0.5);
    setLifetimeMax(preset?.lifetime?.max ?? 1.5);
    setSpeedMin(preset?.initialSpeed?.min ?? 50);
    setSpeedMax(preset?.initialSpeed?.max ?? 100);
    setGravityY(preset?.gravity?.y ?? 0);
    setParticleSize(((preset?.initialSize?.min ?? 8) + (preset?.initialSize?.max ?? 16)) / 2);
  }, [selectedType]);

  useEffect(() => {
    const preset = PARTICLE_PRESETS[selectedType];
    configRef.current = {
      ...preset,
      maxParticles: preset?.maxParticles ?? 200,
      emissionRate,
      lifetime: { min: lifetimeMin, max: lifetimeMax },
      initialSpeed: { min: speedMin, max: speedMax },
      initialDirection: preset?.initialDirection ?? { minAngle: -120, maxAngle: -60 },
      gravity: { x: 0, y: gravityY },
      initialSize: { min: particleSize * 0.7, max: particleSize * 1.3 },
      spawnShape: preset?.spawnShape ?? { kind: 'point' },
      renderStyle: preset?.renderStyle ?? { kind: 'circle' },
    } as ParticleEmitterConfig;
  }, [selectedType, emissionRate, lifetimeMin, lifetimeMax, speedMin, speedMax, gravityY, particleSize]);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      if (poolRef.current && configRef.current) {
        updateParticles(poolRef.current, configRef.current, dt, emitterX, emitterY);
        forceUpdate({});
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [emitterX, emitterY]);

  const handleBurst = useCallback(() => {
    if (poolRef.current) {
      triggerBurst(poolRef.current);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (poolRef.current) {
      resetParticles(poolRef.current);
    }
  }, []);

  const particles = poolRef.current?.particles ?? [];
  const activeCount = poolRef.current?.activeCount ?? 0;
  const preset = PARTICLE_PRESETS[selectedType];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeSelector}
        contentContainerStyle={styles.typeSelectorContent}
      >
        {PARTICLE_EMITTER_METADATA.map((meta) => (
          <Pressable
            key={meta.type}
            onPress={() => setSelectedType(meta.type)}
            style={[
              styles.typeButton,
              selectedType === meta.type && styles.typeButtonSelected,
            ]}
          >
            <Text style={styles.typeIcon}>{meta.icon}</Text>
            <Text
              style={[
                styles.typeText,
                selectedType === meta.type && styles.typeTextSelected,
              ]}
            >
              {meta.displayName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas}>
          <Fill color="#0a0a1a" />
          <ParticleSystemRenderer
            particles={particles}
            renderStyle={preset?.renderStyle ?? { kind: 'circle' }}
            blendMode={preset?.blendMode}
          />
        </Canvas>
        <View style={styles.statsOverlay}>
          <Text style={styles.statsText}>Particles: {activeCount}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.actionButton} onPress={handleBurst}>
          <Text style={styles.actionButtonText}>💥 Burst</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleReset}>
          <Text style={styles.actionButtonText}>🔄 Reset</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.controlsScroll}>
        <View style={styles.controlsContainer}>
          <ControlSlider
            label="Emission Rate"
            value={emissionRate}
            min={0}
            max={300}
            step={5}
            onChange={setEmissionRate}
          />
          <ControlSlider
            label="Lifetime Min"
            value={lifetimeMin}
            min={0.1}
            max={5}
            step={0.1}
            onChange={setLifetimeMin}
          />
          <ControlSlider
            label="Lifetime Max"
            value={lifetimeMax}
            min={0.1}
            max={5}
            step={0.1}
            onChange={setLifetimeMax}
          />
          <ControlSlider
            label="Speed Min"
            value={speedMin}
            min={0}
            max={500}
            step={10}
            onChange={setSpeedMin}
          />
          <ControlSlider
            label="Speed Max"
            value={speedMax}
            min={0}
            max={500}
            step={10}
            onChange={setSpeedMax}
          />
          <ControlSlider
            label="Gravity Y"
            value={gravityY}
            min={-300}
            max={300}
            step={10}
            onChange={setGravityY}
          />
          <ControlSlider
            label="Particle Size"
            value={particleSize}
            min={2}
            max={40}
            step={1}
            onChange={setParticleSize}
          />
        </View>
      </ScrollView>
    </View>
  );
}

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function ControlSlider({ label, value, min, max, step, onChange }: ControlSliderProps) {
  return (
    <View style={styles.controlRow}>
      <View style={styles.controlHeader}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValue}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.sliderButtons}>
        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepButtonText}>-</Text>
        </Pressable>
        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{value.toFixed(1)}</Text>
        </View>
        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  typeSelector: {
    maxHeight: 70,
    backgroundColor: '#1a1a1a',
  },
  typeSelectorContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    minWidth: 70,
  },
  typeButtonSelected: {
    backgroundColor: '#ff6b6b',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  typeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  typeTextSelected: {
    color: '#fff',
  },
  canvasContainer: {
    alignItems: 'center',
    padding: 10,
    position: 'relative',
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  controlRow: {
    marginBottom: 16,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 14,
  },
  controlValue: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    color: '#ff6b6b',
    fontSize: 24,
    fontWeight: '600',
  },
  valueDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  valueText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
  },
});
