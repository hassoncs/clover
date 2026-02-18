import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';

export interface Theme {
  id: string;
  name: string;
  promptModifier: string;
  thumbnailUrl: string | null;
  creatorUserId: string | null;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number | null;
}

interface UseBrowseThemesOptions {
  pageSize?: number;
  initialQuery?: string;
}

interface UseBrowseThemesReturn {
  myThemes: Theme[];
  publicThemes: Theme[];
  isLoadingMy: boolean;
  isLoadingPublic: boolean;
  isRefreshing: boolean;
  hasMoreMyThemes: boolean;
  hasMorePublicThemes: boolean;
  myThemesPage: number;
  publicThemesPage: number;
  searchQuery: string;
  fetchMyThemes: (page: number, showRefresh?: boolean) => Promise<void>;
  fetchPublicThemes: (page: number, showRefresh?: boolean) => Promise<void>;
  loadMoreMyThemes: () => void;
  loadMorePublicThemes: () => void;
  handleRefresh: () => void;
  handleSearchChange: (query: string) => void;
}

const PAGE_SIZE = 20;

export function useBrowseThemes(options: UseBrowseThemesOptions = {}): UseBrowseThemesReturn {
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const [myThemes, setMyThemes] = useState<Theme[]>([]);
  const [publicThemes, setPublicThemes] = useState<Theme[]>([]);
  
  const [isLoadingMy, setIsLoadingMy] = useState(true);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [myThemesPage, setMyThemesPage] = useState(1);
  const [publicThemesPage, setPublicThemesPage] = useState(1);
  
  const [hasMoreMyThemes, setHasMoreMyThemes] = useState(true);
  const [hasMorePublicThemes, setHasMorePublicThemes] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState(options.initialQuery ?? '');

  const fetchMyThemes = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingMy(true);

    try {
      const result = await trpc.assetSystem.themes.list.query({ 
        limit: pageSize, 
        offset: (page - 1) * pageSize,
        query: searchQuery || undefined
      });
      
      if (page === 1) {
        setMyThemes(result as Theme[]);
      } else {
        setMyThemes(prev => [...prev, ...(result as Theme[])]);
      }
      
      setHasMoreMyThemes(result.length === pageSize);
    } catch (err) {
      console.error("Failed to load my themes:", err);
      if (page === 1) setMyThemes([]);
    } finally {
      setIsLoadingMy(false);
      setIsRefreshing(false);
    }
  }, [pageSize, searchQuery]);

  const fetchPublicThemes = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingPublic(true);

    try {
      const result = await trpc.assetSystem.themes.listPublic.query({ 
        limit: pageSize, 
        offset: (page - 1) * pageSize,
        query: searchQuery || undefined
      });
      
      if (page === 1) {
        setPublicThemes(result as Theme[]);
      } else {
        setPublicThemes(prev => [...prev, ...(result as Theme[])]);
      }
      
      setHasMorePublicThemes(result.length === pageSize);
    } catch (err) {
      console.error("Failed to load public themes:", err);
      if (page === 1) setPublicThemes([]);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, [pageSize, searchQuery]);

  const loadMoreMyThemes = useCallback(() => {
    if (!isLoadingMy && hasMoreMyThemes) {
      const nextPage = myThemesPage + 1;
      setMyThemesPage(nextPage);
      fetchMyThemes(nextPage);
    }
  }, [isLoadingMy, hasMoreMyThemes, myThemesPage, fetchMyThemes]);

  const loadMorePublicThemes = useCallback(() => {
    if (!isLoadingPublic && hasMorePublicThemes) {
      const nextPage = publicThemesPage + 1;
      setPublicThemesPage(nextPage);
      fetchPublicThemes(nextPage);
    }
  }, [isLoadingPublic, hasMorePublicThemes, publicThemesPage, fetchPublicThemes]);

  const handleRefresh = useCallback(() => {
    setMyThemesPage(1);
    setPublicThemesPage(1);
    fetchMyThemes(1, true);
    fetchPublicThemes(1, true);
  }, [fetchMyThemes, fetchPublicThemes]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setMyThemesPage(1);
    setPublicThemesPage(1);
  }, []);

  useEffect(() => {
    fetchMyThemes(1);
    fetchPublicThemes(1);
  }, [fetchMyThemes, fetchPublicThemes]);

  return {
    myThemes,
    publicThemes,
    isLoadingMy,
    isLoadingPublic,
    isRefreshing,
    hasMoreMyThemes,
    hasMorePublicThemes,
    myThemesPage,
    publicThemesPage,
    searchQuery,
    fetchMyThemes,
    fetchPublicThemes,
    loadMoreMyThemes,
    loadMorePublicThemes,
    handleRefresh,
    handleSearchChange,
  };
}
