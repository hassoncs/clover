import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { trpcReact } from '@/lib/trpc/react';

export type GenerationStatus = 'idle' | 'creating-job' | 'generating' | 'succeeded' | 'failed';

interface UseAssetGenerationOptions {
  gameId: string;
  onComplete?: (result: { successCount: number; failCount: number }) => void;
  onError?: (error: string) => void;
}

const POLL_INTERVAL_MS = 3000;

export function useAssetGeneration({ gameId, onComplete, onError }: UseAssetGenerationOptions) {
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentPackId, setCurrentPackId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utils = trpcReact.useUtils();

  const createJobMutation = trpcReact.assetSystem.createGenerationJob.useMutation({
    onError: (err) => {
      setGeneratingTemplates(new Set());
      setStatus('failed');
      setError(err.message);
      onError?.(err.message);
    },
  });

  const processJobMutation = trpcReact.assetSystem.processGenerationJob.useMutation();

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const lastCompletedCountRef = useRef(0);

  const pollJobStatus = useCallback(async (jobId: string, packId: string | null) => {
    try {
      const job = await utils.assetSystem.getJob.fetch({ id: jobId });
      
      const tasks = job.tasks ?? [];
      const completed = tasks.filter(t => t.status === 'succeeded').length;
      const failed = tasks.filter(t => t.status === 'failed').length;
      const total = tasks.length;
      
      setProgress({ total, completed, failed });
      
      const completedTemplateIds = new Set(
        tasks.filter(t => t.status === 'succeeded').map(t => t.templateId)
      );
      setGeneratingTemplates(prev => {
        const stillGenerating = new Set<string>();
        prev.forEach(id => {
          if (!completedTemplateIds.has(id)) {
            stillGenerating.add(id);
          }
        });
        return stillGenerating;
      });

      if (completed > lastCompletedCountRef.current && packId) {
        lastCompletedCountRef.current = completed;
        await utils.assetSystem.getPack.invalidate({ id: packId });
      }

      if (job.status === 'succeeded' || job.status === 'failed') {
        stopPolling();
        setCurrentJobId(null);
        setStatus(job.status);
        lastCompletedCountRef.current = 0;
        
        if (packId) {
          await utils.assetSystem.getPack.invalidate({ id: packId });
        }
        await utils.assetSystem.listPacks.invalidate({ gameId });
        setCurrentPackId(null);
        setGeneratingTemplates(new Set());
        
        if (job.status === 'succeeded') {
          onComplete?.({ successCount: completed, failCount: failed });
        } else {
          const failedTask = tasks.find(t => t.status === 'failed');
          onError?.(failedTask?.errorMessage ?? 'Generation failed');
        }
      }
    } catch (err) {
      console.error('[useAssetGeneration] Poll error:', err);
    }
  }, [utils, gameId, stopPolling, onComplete, onError]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const generateAll = useCallback(async (params: {
    packId?: string;
    templateIds: string[];
    themePrompt?: string;
    style?: 'pixel' | 'cartoon' | '3d' | 'flat';
    removeBackground?: boolean;
  }) => {
    if (params.templateIds.length === 0) {
      onError?.('No templates to generate');
      return;
    }

    setError(null);
    setGeneratingTemplates(new Set(params.templateIds));
    setCurrentPackId(params.packId ?? null);
    setStatus('creating-job');
    setProgress({ total: params.templateIds.length, completed: 0, failed: 0 });

    try {
      const { jobId } = await createJobMutation.mutateAsync({
        gameId,
        packId: params.packId,
        templateIds: params.templateIds,
        promptDefaults: {
          themePrompt: params.themePrompt,
          styleOverride: params.style,
          removeBackground: params.removeBackground,
        },
      });

      setCurrentJobId(jobId);
      setStatus('generating');

      processJobMutation.mutate({ jobId });

      stopPolling();
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId, params.packId ?? null);
      }, POLL_INTERVAL_MS);

      setTimeout(() => {
        pollJobStatus(jobId, params.packId ?? null);
      }, 500);

    } catch (err) {
      setGeneratingTemplates(new Set());
      setCurrentPackId(null);
      setStatus('failed');
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      onError?.(message);
    }
  }, [gameId, createJobMutation, processJobMutation, stopPolling, pollJobStatus, onError]);

  const reset = useCallback(() => {
    stopPolling();
    setGeneratingTemplates(new Set());
    setCurrentJobId(null);
    setCurrentPackId(null);
    setStatus('idle');
    setProgress({ total: 0, completed: 0, failed: 0 });
    setError(null);
    createJobMutation.reset();
    processJobMutation.reset();
  }, [stopPolling, createJobMutation, processJobMutation]);

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
    themePrompt?: string;
  }) => {
    const promptDefaults = (params.style || params.themePrompt) ? {
      styleOverride: params.style,
      themePrompt: params.themePrompt,
    } : undefined;
    
    return mutation.mutateAsync({
      gameId,
      name: params.name,
      description: params.description,
      promptDefaults,
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
