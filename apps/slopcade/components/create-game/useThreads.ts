import { useCallback, useState } from 'react';
import { trpcReact as trpc } from '@/lib/trpc/react';

export function useThreads() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  const threadsQuery = trpc.chatThreads.listThreads.useQuery(
    { gameId: gameId!, limit: 50 },
    { enabled: !!gameId }
  );

  const createThreadMutation = trpc.chatThreads.createThread.useMutation();

  const createThread = useCallback(async (targetGameId: string, title?: string) => {
    const result = await createThreadMutation.mutateAsync({ gameId: targetGameId, title });
    setActiveThreadId(result.threadId);
    setGameId(targetGameId);
    threadsQuery.refetch();
    return result.threadId;
  }, [createThreadMutation, threadsQuery]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const initForGame = useCallback((gId: string) => {
    setGameId(gId);
  }, []);

  return {
    threads: threadsQuery.data?.threads ?? [],
    activeThreadId,
    gameId,
    isLoading: threadsQuery.isLoading,
    createThread,
    selectThread,
    initForGame,
  };
}
