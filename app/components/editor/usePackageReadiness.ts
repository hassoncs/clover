import type { AgUiEvent } from "@slopcade/shared/chat";
import type {
	ValidationError,
	ValidationWarning,
} from "@slopcade/shared/validation/gameDefinitionTypes";
import { useCallback, useEffect, useRef } from "react";
import { useChatEventSubscription } from "@/lib/chat/ChatStreamProvider";
import { trpcReact } from "@/lib/trpc/react";

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
		},
	);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useChatEventSubscription(
		useCallback(
			(event: AgUiEvent) => {
				if (event.type === "RUN_FINISHED") {
					readinessQuery.refetch();
				} else if (event.type === "FILE_CHANGED") {
					if (debounceRef.current) {
						clearTimeout(debounceRef.current);
					}
					debounceRef.current = setTimeout(() => {
						readinessQuery.refetch();
						debounceRef.current = null;
					}, 500);
				}
			},
			[readinessQuery],
		),
	);

	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

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
