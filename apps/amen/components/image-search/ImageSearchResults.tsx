import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ImageSearchResultCard } from "./ImageSearchResultCard";

interface SearchResultItem {
	id: string;
	type: string;
	source: string;
	name: string;
	previewUrl: string;
	metadata: {
		collection?: string;
		license?: string;
		width?: number;
		height?: number;
		frameCount?: number;
	};
}

interface ImageSearchResultsProps {
	results: SearchResultItem[];
	isLoading: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
	onResultPress?: (id: string) => void;
	emptyMessage?: string;
}

const NUM_COLUMNS = 3;

export function ImageSearchResults({
	results,
	isLoading,
	hasMore,
	onLoadMore,
	onResultPress,
	emptyMessage = "No results found",
}: ImageSearchResultsProps) {
	const renderItem = useCallback(
		({ item }: { item: SearchResultItem }) => (
			<ImageSearchResultCard
				id={item.id}
				name={item.name}
				previewUrl={item.previewUrl}
				collection={item.metadata.collection}
				onPress={onResultPress}
			/>
		),
		[onResultPress],
	);

	const keyExtractor = useCallback((item: SearchResultItem) => item.id, []);

	const handleEndReached = useCallback(() => {
		if (hasMore && !isLoading) {
			onLoadMore();
		}
	}, [hasMore, isLoading, onLoadMore]);

	const listFooter = useMemo(() => {
		if (!isLoading) return null;
		return (
			<View className="py-5 items-center">
				<ActivityIndicator size="small" color="#6366F1" />
			</View>
		);
	}, [isLoading]);

	if (!isLoading && results.length === 0) {
		return (
			<View className="flex-1 items-center justify-center py-15">
				<Text className="text-4xl mb-3">🔍</Text>
				<Text className="text-secondary-500 text-base text-center">
					{emptyMessage}
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-1">
			<FlashList
				data={results}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				numColumns={NUM_COLUMNS}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.5}
				ListFooterComponent={listFooter}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}
