import { useState, useCallback, useMemo } from 'react';
import { trpcReact } from '@/lib/trpc/react';

export type GenerationStatus = 'idle' | 'creating-job' | 'generating' | 'succeeded' | 'failed';

interface UseAssetGenerationOptions {
  gameId: string;
  onComplete?: (result: { successCount: number; failCount: number }) => void;
  onError?: (error: string) => void;
}

export function useAssetGeneration({ gameId, onComplete, onError }: UseAssetGenerationOptions) {
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentPackId, setCurrentPackId] = useState<string | null>(null);
  const utils = trpcReact.useUtils();

  const createJobMutation = trpcReact.assetSystem.createGenerationJob.useMutation({
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
    },
    onError: (error) => {
      setGeneratingTemplates(new Set());
      onError?.(error.message);
    },
  });

  const processJobMutation = trpcReact.assetSystem.processGenerationJob.useMutation({
    onSuccess: (result) => {
      setGeneratingTemplates(new Set());
      setCurrentJobId(null);
      if (currentPackId) {
        utils.assetSystem.getPack.invalidate({ id: currentPackId });
      }
      setCurrentPackId(null);
      onComplete?.(result);
    },
    onError: (error) => {
      setGeneratingTemplates(new Set());
      setCurrentJobId(null);
      setCurrentPackId(null);
      onError?.(error.message);
    },
  });

  const generateAll = useCallback(async (params: {
    packId?: string;
    templateIds: string[];
    themePrompt?: string;
    style?: 'pixel' | 'cartoon' | '3d' | 'flat';
  }) => {
    if (params.templateIds.length === 0) {
      onError?.('No templates to generate');
      return;
    }

    setGeneratingTemplates(new Set(params.templateIds));
    setCurrentPackId(params.packId ?? null);

    try {
      const { jobId } = await createJobMutation.mutateAsync({
        gameId,
        packId: params.packId,
        templateIds: params.templateIds,
        promptDefaults: {
          themePrompt: params.themePrompt,
          styleOverride: params.style,
        },
      });

      await processJobMutation.mutateAsync({ jobId });
    } catch {
      setGeneratingTemplates(new Set());
      setCurrentPackId(null);
    }
  }, [gameId, createJobMutation, processJobMutation, onError]);

  const reset = useCallback(() => {
    setGeneratingTemplates(new Set());
    setCurrentJobId(null);
    createJobMutation.reset();
    processJobMutation.reset();
  }, [createJobMutation, processJobMutation]);

  const status: GenerationStatus = useMemo(() => {
    if (createJobMutation.isPending) return 'creating-job';
    if (processJobMutation.isPending) return 'generating';
    if (processJobMutation.isSuccess) return 'succeeded';
    if (createJobMutation.isError || processJobMutation.isError) return 'failed';
    return 'idle';
  }, [createJobMutation.isPending, createJobMutation.isError, processJobMutation.isPending, processJobMutation.isSuccess, processJobMutation.isError]);

  const progress = useMemo(() => {
    if (processJobMutation.data) {
      return {
        total: processJobMutation.data.successCount + processJobMutation.data.failCount,
        completed: processJobMutation.data.successCount,
        failed: processJobMutation.data.failCount,
      };
    }
    return { total: generatingTemplates.size, completed: 0, failed: 0 };
  }, [processJobMutation.data, generatingTemplates.size]);

  const error = createJobMutation.error?.message ?? processJobMutation.error?.message ?? null;

  return {
    status,
    jobId: currentJobId,
    progress,
    error,
    generatingTemplates,
    isGenerating: status === 'creating-job' || status === 'generating',
    generateAll,
    reset,
  };
}

export function useCreateAssetPack(gameId: string) {
  const utils = trpcReact.useUtils();
  const mutation = trpcReact.assetSystem.createPack.useMutation({
    onSuccess: () => {
      utils.assetSystem.listPacks.invalidate({ gameId });
    },
  });

  const createPack = useCallback(async (params: {
    name: string;
    description?: string;
    style?: 'pixel' | 'cartoon' | '3d' | 'flat';
  }) => {
    return mutation.mutateAsync({
      gameId,
      name: params.name,
      description: params.description,
      promptDefaults: params.style ? { styleOverride: params.style } : undefined,
    });
  }, [gameId, mutation]);

  return {
    createPack,
    isCreating: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

export function useAssetPacks(gameId: string) {
  return trpcReact.assetSystem.listPacks.useQuery({ gameId });
}

export function useAssetPackWithEntries(packId: string | undefined) {
  return trpcReact.assetSystem.getPack.useQuery(
    { id: packId! },
    { enabled: !!packId }
  );
}

export function useUpdatePlacement() {
  const utils = trpcReact.useUtils();

  return trpcReact.assetSystem.updateEntryPlacement.useMutation({
    onSuccess: (_, variables) => {
      utils.assetSystem.getPack.invalidate({ id: variables.packId });
    },
  });
}
