import { View, Text, TextInput, ScrollView } from 'react-native';
import type { GatesConfig } from './planning-gates';

interface PlanningDocEditorProps {
  planningDoc: Record<string, string>;
  onChange: (doc: Record<string, string>) => void;
  isEditable: boolean;
  config: GatesConfig;
}

export function PlanningDocEditor({ planningDoc, onChange, isEditable, config }: PlanningDocEditorProps) {
  const handleChange = (id: string, text: string) => {
    onChange({
      ...planningDoc,
      [id]: text
    });
  };

  return (
    <View className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <View className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex-row justify-between items-center">
        <Text className="text-gray-300 font-bold text-sm">Game Design Document</Text>
        {!isEditable && <Text className="text-gray-500 text-xs">Read Only</Text>}
      </View>
      
      <ScrollView className="flex-1 p-4">
        {config.gates.map((gate) => (
          <View key={gate.id} className="mb-6">
            <Text className="text-gray-300 font-bold text-sm mb-1">
              {gate.label}
              {gate.required && <Text className="text-red-400 ml-1">*</Text>}
            </Text>
            <Text className="text-gray-500 text-xs mb-2">{gate.description}</Text>
            <TextInput
              className="bg-gray-900/50 p-3 rounded text-gray-200 font-mono text-sm border border-gray-700 focus:border-blue-500"
              multiline
              value={planningDoc[gate.id] || ''}
              onChangeText={(text) => handleChange(gate.id, text)}
              editable={isEditable}
              placeholder={`Enter ${gate.label.toLowerCase()}...`}
              placeholderTextColor="#6B7280"
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>
        ))}
        
        <View className="mb-6">
           <Text className="text-gray-300 font-bold text-sm mb-1">Additional Notes</Text>
           <TextInput
              className="bg-gray-900/50 p-3 rounded text-gray-200 font-mono text-sm border border-gray-700 focus:border-blue-500"
              multiline
              value={planningDoc['content'] || ''}
              onChangeText={(text) => handleChange('content', text)}
              editable={isEditable}
              placeholder="Any other details..."
              placeholderTextColor="#6B7280"
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
        </View>
      </ScrollView>
    </View>
  );
}
