import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue,
} from 'react-native-reanimated';
import { TunableSlider } from './TunableSlider';

// Type imports - these will be available after WORK UNIT 0A completes
// For now, define locally to avoid import errors
interface TuningConfig {
  min: number;
  max: number;
  step: number;
}

interface VariableWithTuning {
  value: number | boolean | string | { x: number; y: number } | { expr: string };
  tuning?: TuningConfig;
  category?: 'physics' | 'gameplay' | 'visuals' | 'economy' | 'ai';
  label?: string;
  description?: string;
  display?: boolean;
}

type GameVariable = number | boolean | string | { x: number; y: number } | { expr: string } | VariableWithTuning;

function isVariableWithTuning(v: GameVariable): v is VariableWithTuning {
  return typeof v === 'object' && v !== null && 'value' in v && !('x' in v) && !('expr' in v);
}

function isTunable(v: GameVariable): boolean {
  return isVariableWithTuning(v) && v.tuning !== undefined;
}

function getValue(v: GameVariable): number | boolean | string | { x: number; y: number } | { expr: string } {
  return isVariableWithTuning(v) ? v.value : v;
}

function getLabel(key: string, v: GameVariable): string {
  if (isVariableWithTuning(v) && v.label) {
    return v.label;
  }
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

interface TuningPanelProps {
  variables: Record<string, GameVariable>;
  currentValues: Record<string, number | boolean | string | { x: number; y: number }>;
  onVariableChange: (key: string, value: number) => void;
  onReset: () => void;
  onExport: () => void;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
}

const CATEGORY_ORDER = ['gameplay', 'physics', 'visuals', 'economy', 'ai', 'other'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  gameplay: '🎮 Gameplay',
  physics: '⚛️ Physics',
  visuals: '✨ Visuals',
  economy: '💰 Economy',
  ai: '🤖 AI',
  other: '📦 Other',
};

export function TuningPanel({
  variables,
  currentValues,
  onVariableChange,
  onReset,
  onExport,
  onSave,
  hasUnsavedChanges = false,
}: TuningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useSharedValue(320);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => {
      const newState = !prev;
      translateX.value = withTiming(newState ? 0 : 320, { duration: 300 });
      return newState;
    });
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Filter and group tunable variables
  const grouped = useMemo(() => {
    const groups: Record<string, Array<{ key: string; variable: VariableWithTuning; currentValue: number }>> = {};
    
    for (const [key, variable] of Object.entries(variables)) {
      if (!isTunable(variable)) continue;
      
      const varWithTuning = variable as VariableWithTuning;
      const cat = varWithTuning.category || 'other';
      const current = currentValues[key];
      
      // Only show numeric values with tuning
      if (typeof current !== 'number') continue;
      
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({
        key,
        variable: varWithTuning,
        currentValue: current,
      });
    }
    
    return groups;
  }, [variables, currentValues]);

  const hasTunables = Object.keys(grouped).length > 0;

  if (!hasTunables) return null;

  return (
    <>
      <Pressable
        className="absolute top-16 right-4 bg-purple-600 rounded-full p-3 shadow-lg z-50"
        onPress={togglePanel}
        style={{ elevation: 5 }}
      >
        <Text className="text-2xl">🎛️</Text>
      </Pressable>

      <Animated.View
        className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 shadow-2xl z-40"
        style={animatedStyle}
      >
        <ScrollView className="p-4 pt-20" showsVerticalScrollIndicator={false}>
          <Text className="text-white text-xl font-bold mb-4">🎛️ Live Tuning</Text>

          {CATEGORY_ORDER.map(category => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;

            return (
              <View key={category} className="mb-6">
                <Text className="text-gray-400 uppercase text-xs mb-3 font-bold">
                  {CATEGORY_LABELS[category] || category}
                </Text>
                {items.map(({ key, variable, currentValue }) => (
                  <TunableSlider
                    key={key}
                    varKey={key}
                    label={getLabel(key, variable)}
                    description={variable.description}
                    currentValue={currentValue}
                    min={variable.tuning!.min}
                    max={variable.tuning!.max}
                    step={variable.tuning!.step}
                    onChange={value => onVariableChange(key, value)}
                  />
                ))}
              </View>
            );
          })}

          {onSave && (
            <Pressable
              className={`py-3 rounded-lg mb-2 ${hasUnsavedChanges ? 'bg-green-600 active:bg-green-500' : 'bg-gray-600 active:bg-gray-500'}`}
              onPress={onSave}
            >
              <Text className="text-white text-center font-semibold">
                {hasUnsavedChanges ? '💾 Save Changes' : '✓ Saved'}
              </Text>
            </Pressable>
          )}

          <View className="flex-row gap-2 mt-2 mb-8">
            <Pressable
              className="flex-1 py-3 bg-gray-700 rounded-lg active:bg-gray-600"
              onPress={onReset}
            >
              <Text className="text-white text-center font-semibold">Reset All</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 bg-purple-600 rounded-lg active:bg-purple-500"
              onPress={onExport}
            >
              <Text className="text-white text-center font-semibold">Export JSON</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

export function hasTunables(variables: Record<string, GameVariable> | undefined): boolean {
  if (!variables) return false;
  return Object.values(variables).some(isTunable);
}
