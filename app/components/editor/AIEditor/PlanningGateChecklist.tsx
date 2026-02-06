import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GatesConfig } from './planning-gates';
import { useEffect, useRef } from 'react';

interface PlanningGateChecklistProps {
  config: GatesConfig;
  gateValues: Record<string, string>;
  satisfiedFields: string[];
  isProcessing: boolean;
}

function GateItem({ 
  label, 
  description, 
  value, 
  isSatisfied, 
  isProcessing 
}: { 
  label: string; 
  description: string; 
  value?: string; 
  isSatisfied: boolean; 
  isProcessing: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSatisfied) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isSatisfied, fadeAnim]);

  return (
    <View className="flex-row items-start gap-3 bg-gray-900/30 p-3 rounded-lg border border-gray-800">
      <View className={`mt-1 w-6 h-6 rounded-full items-center justify-center ${
        isSatisfied ? 'bg-green-500/20' : 'bg-gray-700'
      }`}>
        {isSatisfied ? (
          <Ionicons name="checkmark" size={16} color="#4ADE80" />
        ) : isProcessing ? (
          <ActivityIndicator size="small" color="#60A5FA" />
        ) : (
          <View className="w-2 h-2 rounded-full bg-gray-500" />
        )}
      </View>
      
      <View className="flex-1">
        <Text className={`font-bold text-base ${isSatisfied ? 'text-green-400' : 'text-gray-300'}`}>
          {label}
        </Text>
        
        {!isSatisfied && (
          <Text className="text-gray-500 text-sm mt-1">{description}</Text>
        )}

        {isSatisfied && value && (
          <Animated.View style={{ opacity: fadeAnim }} className="mt-2 bg-green-900/20 p-2 rounded border border-green-900/50">
            <Text className="text-green-200/90 text-sm italic">"{value}"</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export function PlanningGateChecklist({ config, gateValues, satisfiedFields, isProcessing }: PlanningGateChecklistProps) {
  const satisfiedCount = satisfiedFields.length;
  const totalCount = config.gates.length;
  const progress = (satisfiedCount / totalCount) * 100;

  return (
    <View className="bg-gray-800 rounded-xl p-5 mb-6 border border-gray-700 shadow-lg">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white font-bold text-xl">AI Planning</Text>
        <Text className="text-blue-400 font-mono font-bold">
          {satisfiedCount}/{totalCount} Gates
        </Text>
      </View>

      <View className="h-2 bg-gray-700 rounded-full overflow-hidden mb-6">
        <View 
          className="h-full bg-blue-500" 
          style={{ width: `${progress}%` }} 
        />
      </View>

      <View className="gap-3">
        {config.gates.map((gate) => {
          const isSatisfied = satisfiedFields.includes(gate.id);
          const value = gateValues[gate.id];
          
          return (
            <GateItem
              key={gate.id}
              label={gate.label}
              description={gate.description}
              value={value}
              isSatisfied={isSatisfied}
              isProcessing={isProcessing && !isSatisfied}
            />
          );
        })}
      </View>
    </View>
  );
}
