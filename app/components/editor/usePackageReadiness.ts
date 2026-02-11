import { useState, useCallback } from 'react';
import { trpcReact } from '@/lib/trpc/react';
import type { ValidationError, ValidationWarning } from '@slopcade/shared/validation/gameDefinitionTypes';

export interface ReadinessState {
  ready: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  buildId: string;
  gameId: string;
  checkedAt: number;
}

export function usePackageReadiness(gameId: string | null) {
  const readinessQuery = trpcReact.packageReadiness.get.useQuery(
    { gameId: gameId! },
    { 
      enabled: !!gameId,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  const compileMutation = trpcReact.packageCompiler.compile.useMutation();

  const checkNow = useCallback(() => {
    readinessQuery.refetch();
  }, [readinessQuery]);

  const triggerCompile = useCallback(() => {
    if (gameId) {
      compileMutation.mutate({ gameId });
    }
  }, [gameId, compileMutation]);

  return {
    ready: readinessQuery.data?.ready ?? false,
    errors: readinessQuery.data?.errors ?? [],
    warnings: readinessQuery.data?.warnings ?? [],
    isChecking: readinessQuery.isFetching,
    isCompiling: compileMutation.isPending,
    checkNow,
    triggerCompile,
    lastChecked: readinessQuery.data?.checkedAt,
    buildId: readinessQuery.data?.buildId,
  };
}
