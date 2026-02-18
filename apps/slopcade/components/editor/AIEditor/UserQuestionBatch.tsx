import { View, Text, Pressable, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { UserQuestion } from '@slopcade/shared';
import { UserQuestionCard } from './UserQuestionCard';

interface UserQuestionBatchProps {
  batchId: string;
  questions: UserQuestion[];
  stage: string;
  onSubmit: (answers: string[][]) => void;
}

export function UserQuestionBatch({
  batchId,
  questions,
  stage,
  onSubmit,
}: UserQuestionBatchProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<number, string>>({});

  const handleSelectLabel = (index: number, label: string, multiple: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[index] || [];
      if (multiple) {
        return { ...prev, [index]: [...current, label] };
      } else {
        return { ...prev, [index]: [label] };
      }
    });
  };

  const handleDeselectLabel = (index: number, label: string) => {
    setSelectedAnswers((prev) => {
      const current = prev[index] || [];
      return { ...prev, [index]: current.filter((l) => l !== label) };
    });
  };

  const handleCustomTextChange = (index: number, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [index]: text }));
  };

  const isSubmitEnabled = useMemo(() => {
    return questions.every((_, index) => {
      const hasSelection = (selectedAnswers[index]?.length ?? 0) > 0;
      const hasCustomText = (customTexts[index]?.trim().length ?? 0) > 0;
      return hasSelection || hasCustomText;
    });
  }, [questions, selectedAnswers, customTexts]);

  const handleSubmit = () => {
    if (!isSubmitEnabled) return;

    const finalAnswers = questions.map((_, index) => {
      const selections = selectedAnswers[index] || [];
      const custom = customTexts[index]?.trim();
      
      if (custom) {
        return [...selections, custom];
      }
      return selections;
    });

    onSubmit(finalAnswers);
  };

  return (
    <View className="flex-1">
      <View className="mb-6 flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
          <Ionicons name="chatbubbles" size={24} color="white" />
        </View>
        <View>
          <Text className="text-2xl font-bold text-white">The AI has questions</Text>
          <Text className="text-gray-400">
            Help shape the {stage} of your game.
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {questions.map((question, index) => (
          <UserQuestionCard
            key={`${batchId}-${question.header}-${index}`}
            question={question}
            selectedLabels={selectedAnswers[index] || []}
            customText={customTexts[index] || ''}
            onSelectLabel={(label) => handleSelectLabel(index, label, !!question.multiple)}
            onDeselectLabel={(label) => handleDeselectLabel(index, label)}
            onCustomTextChange={(text) => handleCustomTextChange(index, text)}
          />
        ))}

        <Pressable
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
          className={`w-full py-4 rounded-xl items-center justify-center mt-4 mb-8 ${
            isSubmitEnabled
              ? 'bg-blue-600 active:bg-blue-700 shadow-lg shadow-blue-900/20'
              : 'bg-gray-800 border border-gray-700 opacity-50'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Text className={`font-bold text-lg ${isSubmitEnabled ? 'text-white' : 'text-gray-500'}`}>
              Submit Answers
            </Text>
            {isSubmitEnabled && <Ionicons name="arrow-forward-circle" size={24} color="white" />}
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
