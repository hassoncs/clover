import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';

interface PublicGame {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string | null;
  definition: string;
  thumbnailUrl: string | null;
  isPublic: boolean;
}

interface UseBrowseGamesOptions {
  pageSize?: number;
}

interface UseBrowseGamesReturn {
  publicGames: PublicGame[];
  isLoadingPublic: boolean;
  isRefreshing: boolean;
  hasMorePublicGames: boolean;
  publicGamesPage: number;
  totalPublicGames: number;
  fetchPublicGames: (page: number, showRefresh?: boolean) => Promise<void>;
  handleRefresh: () => void;
}

export function useBrowseGames(options: UseBrowseGamesOptions = {}): UseBrowseGamesReturn {
  const pageSize = options.pageSize ?? 10;

  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publicGamesPage, setPublicGamesPage] = useState(1);
  const [hasMorePublicGames, setHasMorePublicGames] = useState(true);
  const [totalPublicGames, setTotalPublicGames] = useState(0);

  const fetchPublicGames = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingPublic(true);

    try {
      const result = await trpc.games.listPublic.query({ 
        limit: pageSize, 
        offset: (page - 1) * pageSize 
      });
      
      if (page === 1) {
        setPublicGames(result);
      } else {
        setPublicGames(prev => [...prev, ...result]);
      }
      
      setHasMorePublicGames(result.length === pageSize);
      setTotalPublicGames(prev => page === 1 ? result.length : prev);
    } catch (err) {
      console.error("Failed to load public games:", err);
      if (page === 1) setPublicGames([]);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, [pageSize]);

  const handleRefresh = useCallback(() => {
    setPublicGamesPage(1);
    fetchPublicGames(1, true);
  }, [fetchPublicGames]);

  useEffect(() => {
    fetchPublicGames(1);
  }, [fetchPublicGames]);

  return {
    publicGames,
    isLoadingPublic,
    isRefreshing,
    hasMorePublicGames,
    publicGamesPage,
    totalPublicGames,
    fetchPublicGames,
    handleRefresh,
  };
}
