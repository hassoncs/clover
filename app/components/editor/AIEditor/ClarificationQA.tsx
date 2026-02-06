import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ClarificationQuestion } from '@slopcade/shared';

interface ClarificationQAProps {
  questions: ClarificationQuestion[];
  onSubmitAnswer: (questionId: string, answer: string) => Promise<void>;
  isSubmitting: boolean;
}

export function ClarificationQA({ questions, onSubmitAnswer, isSubmitting }: ClarificationQAProps) {
  const [answerText, setAnswerText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Sort questions: pending first, then by time
  const sortedQuestions = [...questions].sort((a, b) => {
    if (!a.answer && b.answer) return -1;
    if (a.answer && !b.answer) return 1;
    // If both pending or both answered, sort by creation (we don't have createdAt on the type explicitly, 
    // but we can assume the array order from events is chronological)
    return 0; 
  });

  const pendingQuestion = questions.find(q => !q.answer);
  const answeredQuestions = questions.filter(q => !!q.answer);

  const handleSubmit = async () => {
    if (!pendingQuestion || !answerText.trim()) return;
    
    setSubmittingId(pendingQuestion.questionId);
    try {
      await onSubmitAnswer(pendingQuestion.questionId, answerText);
      setAnswerText('');
    } finally {
      setSubmittingId(null);
    }
  };

  if (questions.length === 0) return null;

  return (
    <View className="w-full mb-6">
      {/* Pending Question Card - High Emphasis */}
      {pendingQuestion && (
        <View className="bg-gray-800 border-l-4 border-yellow-500 rounded-r-lg shadow-lg overflow-hidden mb-4">
          <View className="p-4 bg-yellow-500/10">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="alert-circle" size={20} color="#EAB308" />
              <Text className="text-yellow-500 font-bold uppercase text-xs tracking-wider">
                Clarification Needed • {pendingQuestion.stage}
              </Text>
            </View>
            
            <Text className="text-white text-lg font-medium mb-4 leading-6">
              {pendingQuestion.question}
            </Text>
            
            {pendingQuestion.context && (
              <View className="bg-black/20 p-3 rounded mb-4">
                <Text className="text-gray-400 text-sm italic">
                  "{pendingQuestion.context}"
                </Text>
              </View>
            )}

            <View className="bg-gray-900 rounded-lg border border-gray-700 p-1">
              <TextInput
                className="text-white p-3 min-h-[80px] text-base"
                placeholder="Type your answer here..."
                placeholderTextColor="#6B7280"
                multiline
                value={answerText}
                onChangeText={setAnswerText}
                textAlignVertical="top"
              />
              <View className="flex-row justify-end p-2">
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting || !answerText.trim()}
                  className={`px-4 py-2 rounded-md flex-row items-center gap-2 ${
                    !answerText.trim() || isSubmitting 
                      ? 'bg-gray-700 opacity-50' 
                      : 'bg-blue-600 active:bg-blue-700'
                  }`}
                >
                  {isSubmitting && submittingId === pendingQuestion.questionId ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold">Send Answer</Text>
                      <Ionicons name="arrow-up-circle" size={16} color="white" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* History - Lower Emphasis */}
      {answeredQuestions.length > 0 && (
        <View className="mt-4">
          <Text className="text-gray-500 text-xs font-bold uppercase mb-2 ml-1">History</Text>
          {answeredQuestions.slice().reverse().map((q) => (
            <View key={q.questionId} className="bg-gray-800/50 rounded-lg p-4 mb-2 border border-gray-700/50">
              <View className="flex-row gap-3 mb-2">
                <View className="w-6 h-6 rounded-full bg-purple-500/20 items-center justify-center">
                  <Ionicons name="logo-android" size={12} color="#A855F7" />
                </View>
                <Text className="text-gray-300 flex-1 text-sm">{q.question}</Text>
              </View>
              
              <View className="flex-row gap-3 pl-9">
                <View className="flex-1 bg-gray-700/30 rounded p-2">
                  <Text className="text-gray-400 text-sm">{q.answer}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
