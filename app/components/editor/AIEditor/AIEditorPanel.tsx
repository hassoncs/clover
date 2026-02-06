import { View, Text, ActivityIndicator, ScrollView, TextInput, Pressable } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useAgentRun } from './useAgentRun';
import { TierSelector } from './TierSelector';
import { CostDisplay } from './CostDisplay';
import { RunControls } from './RunControls';
import { RunProgress } from './RunProgress';
import { PlanningGateChecklist } from './PlanningGateChecklist';
import { ClarificationQA } from './ClarificationQA';
import { UserQuestionBatch } from './UserQuestionBatch';
import { getDefaultGatesConfig } from './planning-gates';
import type { AgentTier } from '@slopcade/shared';
import { Ionicons } from '@expo/vector-icons';

interface AIEditorPanelProps {
  gameId: string;
  runId?: string;
}

export function AIEditorPanel({ gameId, runId: initialRunId }: AIEditorPanelProps) {
  const [localRunId, setLocalRunId] = useState<string | undefined>(initialRunId);
  const [selectedTier, setSelectedTier] = useState<AgentTier>('standard');
  const [promptText, setPromptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasReviewedPlan, setHasReviewedPlan] = useState(false);

  const gatesConfig = useMemo(() => getDefaultGatesConfig(), []);

  const { 
    run, 
    events, 
    questions,
    pendingQuestions,
    gateValues,
    satisfiedFields,
    createRun, 
    startRun, 
    pauseRun, 
    resumeRun, 
    cancelRun, 
    submitAnswer,
    submitUserAnswer,
    isLoading,
    error
  } = useAgentRun(localRunId);

  useEffect(() => {
    if (run?.planningDocJson && !promptText) {
      try {
        const parsed = JSON.parse(run.planningDocJson);
        if (parsed.content) {
          setPromptText(parsed.content);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [run?.planningDocJson, promptText]);

  const handleCreateAndStart = async () => {
    if (!promptText.trim()) return;

    setIsProcessing(true);
    try {
      const planningDocJson = JSON.stringify({ content: promptText });
      
      let currentRunId = localRunId;
      if (!currentRunId) {
        currentRunId = await createRun({
          gameId,
          tier: selectedTier,
          planningDocJson
        });
        setLocalRunId(currentRunId);
      }

      if (currentRunId) {
        await startRun(currentRunId);
      }
    } catch (err) {
      console.error('Failed to start run:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    if (!localRunId) return;
    setIsProcessing(true);
    try {
      await pauseRun(localRunId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async () => {
    if (!localRunId) return;
    setIsProcessing(true);
    try {
      await resumeRun(localRunId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!localRunId) return;
    setIsProcessing(true);
    try {
      await cancelRun(localRunId);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-400 mt-4">Loading AI Session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 p-6">
        <Text className="text-red-400 text-lg text-center mb-4">Error: {error}</Text>
      </View>
    );
  }

  const isRunning = run?.status === 'running' || run?.status === 'queued' || run?.status === 'paused' || run?.status === 'waiting_for_input';
  const isFinished = run?.status === 'succeeded' || run?.status === 'failed' || run?.status === 'canceled';
  
  const showPage1 = !run || run.status === 'planning';
  const showPage2 = run && !showPage1 && (run.currentStepIndex === 0 || !hasReviewedPlan);
  const showPage3 = run && !showPage1 && !showPage2;

  const stages = ['planning', 'build', 'refine', 'theme', 'asset'] as const;
  const currentStage = run ? stages[Math.min(run.currentStepIndex, stages.length - 1)] : 'planning';

  const allGatesSatisfied = satisfiedFields.length === gatesConfig.gates.length;

  return (
    <View className="flex-1 bg-gray-900">
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {showPage1 && (
          <View>
            <View className="mb-8">
              <Text className="text-3xl font-bold text-white mb-2">AI Game Designer</Text>
              <Text className="text-gray-400 text-lg">
                Describe your dream game and let the AI build it for you.
              </Text>
            </View>

            <View className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
              <TextInput
                className="text-white text-lg min-h-[150px]"
                placeholder="E.g. A physics puzzle game where you drop fruits to merge them into bigger fruits..."
                placeholderTextColor="#6B7280"
                multiline
                textAlignVertical="top"
                value={promptText}
                onChangeText={setPromptText}
              />
            </View>

            <View className="mb-8">
              <Text className="text-gray-300 font-bold mb-3 uppercase text-xs tracking-wider">Select Intelligence Tier</Text>
              <TierSelector 
                selectedTier={selectedTier} 
                onSelect={setSelectedTier} 
              />
            </View>

            <Pressable
              onPress={handleCreateAndStart}
              disabled={isProcessing || !promptText.trim()}
              className={`w-full py-4 rounded-xl items-center justify-center shadow-lg ${
                isProcessing || !promptText.trim() 
                  ? 'bg-gray-700 opacity-50' 
                  : 'bg-blue-600 active:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-bold text-xl">Create My Game</Text>
                  <Ionicons name="arrow-forward" size={24} color="white" />
                </View>
              )}
            </Pressable>
          </View>
        )}

        {showPage2 && (
          <View>
            <View className="mb-6">
              <Text className="text-2xl font-bold text-white mb-2">Analyzing Request...</Text>
              <Text className="text-gray-400">
                The AI is breaking down your prompt into a concrete game plan.
              </Text>
            </View>

            {pendingQuestions && (
              <View className="mb-8">
                <UserQuestionBatch
                  batchId={pendingQuestions.batchId}
                  questions={pendingQuestions.questions}
                  stage={pendingQuestions.stage}
                  onSubmit={(answers) => submitUserAnswer(pendingQuestions.batchId, answers)}
                />
              </View>
            )}

            <PlanningGateChecklist 
              config={gatesConfig}
              gateValues={gateValues}
              satisfiedFields={satisfiedFields}
              isProcessing={isRunning}
            />

            <ClarificationQA 
              questions={questions}
              onSubmitAnswer={submitAnswer}
              isSubmitting={isProcessing}
            />

            <Pressable
              onPress={() => setHasReviewedPlan(true)}
              disabled={!allGatesSatisfied}
              className={`w-full py-4 rounded-xl items-center justify-center mt-4 ${
                allGatesSatisfied 
                  ? 'bg-green-600 active:bg-green-700' 
                  : 'bg-gray-800 border border-gray-700 opacity-50'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold text-lg ${allGatesSatisfied ? 'text-white' : 'text-gray-500'}`}>
                  {allGatesSatisfied ? 'Continue to Build' : 'Waiting for Plan...'}
                </Text>
                {allGatesSatisfied && <Ionicons name="checkmark-circle" size={24} color="white" />}
              </View>
            </Pressable>

            <RunControls 
              status={run?.status ?? 'planning'}
              onStart={() => {}}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              isProcessing={isProcessing}
              isStartDisabled={true}
            />
          </View>
        )}

        {showPage3 && run && (
          <View>
            <View className="mb-6">
              <Text className="text-2xl font-bold text-white mb-2">Building Game</Text>
              <Text className="text-gray-400">
                Your game is being constructed. Watch the progress below.
              </Text>
            </View>

            {pendingQuestions && (
              <View className="mb-8">
                <UserQuestionBatch
                  batchId={pendingQuestions.batchId}
                  questions={pendingQuestions.questions}
                  stage={pendingQuestions.stage}
                  onSubmit={(answers) => submitUserAnswer(pendingQuestions.batchId, answers)}
                />
              </View>
            )}

            <View className="mb-6">
              <RunProgress  
                currentStage={currentStage}
                currentStepIndex={run.currentStepIndex}
                totalSteps={run.totalSteps}
                status={run.status}
              />
            </View>

            <View className="mb-6">
              <CostDisplay 
                estimatedCostMicros={run.estimatedCostMicros}
                actualCostMicros={run.actualCostMicros}
                reservedMicros={run.reservedMicros}
                isFinished={isFinished}
              />
            </View>

            <RunControls 
              status={run.status}
              onStart={() => {}}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          </View>
        )}

        {!showPage1 && events.length > 0 && (
          <View className="mt-8 bg-black/30 p-4 rounded-lg border border-gray-800">
            <Text className="text-gray-500 font-mono text-xs mb-2 uppercase tracking-wider">System Logs</Text>
            {events.slice().reverse().map((event) => (
              <Text key={`${event.seq}-${event.timestamp}`} className="text-gray-500 font-mono text-xs mb-1">
                <Text className="text-gray-600">[{new Date(event.timestamp).toLocaleTimeString()}]</Text> {event.eventType}
              </Text>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}
