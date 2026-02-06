import { View, Text } from 'react-native';
import type { AgentStepStage } from '@slopcade/shared';

interface RunProgressProps {
  currentStage?: AgentStepStage;
  currentStepIndex: number;
  totalSteps: number;
  status: string;
}

const STAGES: { id: AgentStepStage; label: string }[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'build', label: 'Build' },
  { id: 'refine', label: 'Refine' },
  { id: 'theme', label: 'Theme' },
  { id: 'asset', label: 'Assets' },
];

export function RunProgress({ currentStage, currentStepIndex, totalSteps, status }: RunProgressProps) {
  const progressPercent = Math.min(100, Math.max(0, (currentStepIndex / totalSteps) * 100));

  return (
    <View className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <View className="flex-row justify-between mb-2">
        <Text className="text-gray-300 font-bold">
          {status === 'queued' ? 'Queued...' : `Step ${currentStepIndex + 1} / ${totalSteps}`}
        </Text>
        <Text className="text-blue-400 font-medium">{Math.round(progressPercent)}%</Text>
      </View>

      <View className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
        <View 
          className="h-full bg-blue-500" 
          style={{ width: `${progressPercent}%` }} 
        />
      </View>

      <View className="flex-row justify-between">
        {STAGES.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isPast = STAGES.findIndex(s => s.id === currentStage) > index;
          
          return (
            <View key={stage.id} className="items-center">
              <View className={`w-3 h-3 rounded-full mb-1 ${
                isActive ? 'bg-blue-500 ring-2 ring-blue-500/50' : 
                isPast ? 'bg-green-500' : 'bg-gray-600'
              }`} />
              <Text className={`text-[10px] ${
                isActive ? 'text-blue-400 font-bold' : 
                isPast ? 'text-green-400' : 'text-gray-500'
              }`}>
                {stage.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
