import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { EMBEDDED_MANIFEST, EMBEDDED_GAME_JSONS } from '@/lib/offline/embedded-games-registry';

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
    
    const loadLocalGames = () => {
      try {
        const manifest = EMBEDDED_MANIFEST as { games?: Array<{ gameId: string }> };
        const localGamesList = (manifest.games || []).map((g) => {
          const gameJson = EMBEDDED_GAME_JSONS[g.gameId] as { title?: string; description?: string } | undefined;
          return {
            id: g.gameId,
            title: gameJson?.title ?? g.gameId,
            description: gameJson?.description ?? '',
            playCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: null,
            definition: '',
            thumbnailUrl: null,
            isPublic: true,
            source: 'template' as const,
          };
        });
        setLocalGames(localGamesList);
      } catch (err) {
        console.warn('Failed to load local template games:', err);
        setLocalGames([]);
      }
    };
    
    loadLocalGames();
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
