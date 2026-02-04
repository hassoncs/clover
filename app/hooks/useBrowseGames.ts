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
  source: 'database' | 'template';
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
  const isDev = __DEV__;

  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [localGames, setLocalGames] = useState<PublicGame[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publicGamesPage, setPublicGamesPage] = useState(1);
  const [hasMorePublicGames, setHasMorePublicGames] = useState(true);
  const [totalPublicGames, setTotalPublicGames] = useState(0);

  useEffect(() => {
    if (!isDev) return;
    
    const fetchLocalGames = async () => {
      try {
        const response = await fetch('http://localhost:8789/local-games');
        const data = await response.json();
        setLocalGames(data.games);
      } catch (err) {
        console.warn('Failed to load local template games:', err);
        setLocalGames([]);
      }
    };
    
    fetchLocalGames();
  }, [isDev]);

  const fetchPublicGames = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingPublic(true);

    try {
      const result = await trpc.games.listPublic.query({ 
        limit: pageSize, 
        offset: (page - 1) * pageSize 
      });
      
      if (page === 1) {
        const combined = [...localGames, ...result];
        setPublicGames(combined);
      } else {
        setPublicGames(prev => [...prev, ...result]);
      }
      
      setHasMorePublicGames(result.length === pageSize);
      setTotalPublicGames(prev => page === 1 ? result.length + localGames.length : prev);
    } catch (err) {
      console.error("Failed to load public games:", err);
      if (page === 1) setPublicGames(localGames);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, [pageSize, localGames]);

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
