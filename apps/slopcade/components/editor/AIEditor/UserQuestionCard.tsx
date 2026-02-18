import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserQuestion } from '@slopcade/shared';

interface UserQuestionCardProps {
  question: UserQuestion;
  selectedLabels: string[];
  customText: string;
  onSelectLabel: (label: string) => void;
  onDeselectLabel: (label: string) => void;
  onCustomTextChange: (text: string) => void;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'puzzle-piece': 'extension-puzzle',
  'running': 'walk',
  'grid': 'grid',
  'magnet': 'magnet',
};

export function UserQuestionCard({
  question,
  selectedLabels,
  customText,
  onSelectLabel,
  onDeselectLabel,
  onCustomTextChange,
}: UserQuestionCardProps) {
  const isMultiple = question.multiple === true;

  const handleOptionPress = (label: string) => {
    const isSelected = selectedLabels.includes(label);
    if (isSelected) {
      onDeselectLabel(label);
    } else {
      onSelectLabel(label);
    }
  };

  return (
    <View className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
      <View className="mb-4">
        <Text className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-1">
          {question.header}
        </Text>
        <Text className="text-white text-lg font-medium leading-6">
          {question.question}
        </Text>
      </View>

      <View className="gap-3">
        {question.options.map((option) => {
          const isSelected = selectedLabels.includes(option.label);
          const iconName = option.iconKey ? ICON_MAP[option.iconKey] : undefined;

          return (
            <Pressable
              key={option.label}
              onPress={() => handleOptionPress(option.label)}
              className={`flex-row items-center p-3 rounded-xl border-2 ${
                isSelected
                  ? 'bg-blue-500/10 border-blue-500'
                  : 'bg-gray-700/30 border-gray-700'
              }`}
            >
              {iconName && (
                <View className={`mr-3 w-8 h-8 rounded-full items-center justify-center ${
                  isSelected ? 'bg-blue-500' : 'bg-gray-600'
                }`}>
                  <Ionicons 
                    name={iconName} 
                    size={16} 
                    color="white" 
                  />
                </View>
              )}
              
              <View className="flex-1">
                <Text className={`font-bold text-base ${
                  isSelected ? 'text-white' : 'text-gray-300'
                }`}>
                  {option.label}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {option.description}
                </Text>
              </View>

              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-2 ${
                isSelected 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'border-gray-500'
              }`}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
            </Pressable>
          );
        })}

        <View className="mt-2">
          <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">
            {question.options.length > 0 ? 'Or type your own answer' : 'Your Answer'}
          </Text>
          <TextInput
            className="bg-gray-900 text-white p-3 rounded-xl border border-gray-700 min-h-[50px]"
            placeholder="Type something..."
            placeholderTextColor="#6B7280"
            value={customText}
            onChangeText={onCustomTextChange}
            multiline={question.options.length === 0}
          />
        </View>
      </View>
    </View>
  );
}
