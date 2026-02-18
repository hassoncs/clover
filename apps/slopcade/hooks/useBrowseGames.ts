import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { trpcReact } from "@/lib/trpc/react";

type SortOption = "newest" | "popular" | "alphabetical" | "rating";

interface UseBrowseGamesOptions {
	pageSize?: number;
	searchQuery?: string;
	sortBy?: SortOption;
}

export function useBrowseGames(options: UseBrowseGamesOptions = {}) {
	const pageSize = options.pageSize ?? 20;
	const searchQuery = options.searchQuery?.trim() ?? "";
	const sortBy = options.sortBy ?? "popular";
	const isSearching = searchQuery.length > 0;

	const [feedPage, setFeedPage] = useState(0);
	const [searchPage, setSearchPage] = useState(0);

	const feedQuery = trpcReact.games.listPublic.useQuery(
		{ limit: pageSize, offset: feedPage * pageSize },
		{ enabled: !isSearching, placeholderData: keepPreviousData },
	);

	const searchQueryResult = trpcReact.games.search.useQuery(
		{
			query: searchQuery,
			limit: pageSize,
			offset: searchPage * pageSize,
			sortBy,
		},
		{ enabled: isSearching, placeholderData: keepPreviousData },
	);

	const games = useMemo(() => {
		if (isSearching) {
			return (searchQueryResult.data?.results ?? []).map((g) => ({
				...g,
				source: "database" as const,
			}));
		}
		return (feedQuery.data ?? []).map((g) => ({
			...g,
			source: "database" as const,
		}));
	}, [isSearching, searchQueryResult.data, feedQuery.data]);

	const isLoading = isSearching
		? searchQueryResult.isLoading
		: feedQuery.isLoading;
	const isFetching = isSearching
		? searchQueryResult.isFetching
		: feedQuery.isFetching;

	const hasMore = isSearching
		? (searchQueryResult.data?.hasMore ?? false)
		: (feedQuery.data?.length ?? 0) === pageSize;

	const loadMore = useCallback(() => {
		if (isSearching) {
			setSearchPage((p) => p + 1);
		} else {
			setFeedPage((p) => p + 1);
		}
	}, [isSearching]);

	const refresh = useCallback(() => {
		if (isSearching) {
			setSearchPage(0);
			searchQueryResult.refetch();
		} else {
			setFeedPage(0);
			feedQuery.refetch();
		}
	}, [isSearching, searchQueryResult, feedQuery]);

	return {
		games,
		isLoading,
		isFetching,
		isRefreshing: isFetching && !isLoading,
		hasMore,
		loadMore,
		refresh,
	};
}
