import { useState, useEffect, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { EMBEDDED_MANIFEST, EMBEDDED_METADATA } from '@/lib/offline/embedded-games-registry';

interface PublicGame {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string | null;
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

  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publicGamesPage, setPublicGamesPage] = useState(1);
  const [hasMorePublicGames, setHasMorePublicGames] = useState(true);
  const [totalPublicGames, setTotalPublicGames] = useState(0);

  const embeddedGames = useMemo<PublicGame[]>(() => {
    try {
      const manifest = EMBEDDED_MANIFEST as { games?: Array<{ gameId: string }> };
      return (manifest.games || []).map((g) => {
        const meta = EMBEDDED_METADATA[g.gameId] as { title?: string; description?: string } | undefined;
        return {
          id: g.gameId,
          title: meta?.title ?? g.gameId,
          description: meta?.description ?? '',
          playCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: null,
          thumbnailUrl: null,
          isPublic: true,
          source: 'template' as const,
        };
      });
    } catch (err) {
      console.warn('Failed to load embedded template games:', err);
      return [];
    }
  }, []);

  const fetchPublicGames = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingPublic(true);

    try {
      const result = await trpc.games.listPublic.query({ 
        limit: pageSize, 
        offset: (page - 1) * pageSize 
      });
      
      if (page === 1) {
        setPublicGames([...embeddedGames, ...result]);
      } else {
        setPublicGames(prev => [...prev, ...result]);
      }
      
      setHasMorePublicGames(result.length === pageSize);
      setTotalPublicGames(prev => page === 1 ? result.length + embeddedGames.length : prev);
    } catch (err) {
      console.error("Failed to load public games:", err);
      if (page === 1) setPublicGames(embeddedGames);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, [pageSize, embeddedGames]);

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
