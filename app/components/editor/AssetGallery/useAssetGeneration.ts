import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpcReact } from "@/lib/trpc/react";

export type GenerationStatus =
	| "idle"
	| "creating-job"
	| "generating"
	| "succeeded"
	| "failed";

interface UseAssetGenerationOptions {
	gameId: string;
	onComplete?: (result: { successCount: number; failCount: number }) => void;
	onError?: (error: string) => void;
}

const POLL_INTERVAL_MS = 3000;

export function useAssetGeneration({
	gameId,
	onComplete,
	onError,
}: UseAssetGenerationOptions) {
	const [generatingTemplates, setGeneratingPrefabs] = useState<Set<string>>(
		new Set(),
	);
	const [currentJobId, setCurrentJobId] = useState<string | null>(null);
	const [currentRemixId, setCurrentRemixId] = useState<string | null>(null);
	const [status, setStatus] = useState<GenerationStatus>("idle");
	const [progress, setProgress] = useState({
		total: 0,
		completed: 0,
		failed: 0,
	});
	const [error, setError] = useState<string | null>(null);

	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const utils = trpcReact.useUtils();

	const createJobMutation =
		trpcReact.assetSystem.createGenerationJob.useMutation({
			onError: (err) => {
				setGeneratingPrefabs(new Set());
				setStatus("failed");
				setError(err.message);
				onError?.(err.message);
			},
		});

	const processJobMutation =
		trpcReact.assetSystem.processGenerationJob.useMutation();

	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
	}, []);

	const lastCompletedCountRef = useRef(0);

	const pollJobStatus = useCallback(
		async (jobId: string, remixId: string | null) => {
			try {
				const job = await utils.assetSystem.getJob.fetch({ id: jobId });

				const tasks = job.tasks ?? [];
				const completed = tasks.filter((t) => t.status === "succeeded").length;
				const failed = tasks.filter((t) => t.status === "failed").length;
				const total = tasks.length;

				setProgress({ total, completed, failed });

				const completedTemplateIds = new Set(
					tasks.filter((t) => t.status === "succeeded").map((t) => t.prefabId),
				);
				setGeneratingPrefabs((prev) => {
					const stillGenerating = new Set<string>();
					prev.forEach((id) => {
						if (!completedTemplateIds.has(id)) {
							stillGenerating.add(id);
						}
					});
					return stillGenerating;
				});

				if (completed > lastCompletedCountRef.current && remixId) {
					lastCompletedCountRef.current = completed;
					await utils.assetSystem.remixes.getRemix.invalidate({ id: remixId });
				}

				if (job.status === "succeeded" || job.status === "failed") {
					stopPolling();
					setCurrentJobId(null);
					setStatus(job.status);
					lastCompletedCountRef.current = 0;

					if (remixId) {
						await utils.assetSystem.remixes.getRemix.invalidate({
							id: remixId,
						});
					}
					await utils.assetSystem.remixes.listRemixes.invalidate({ gameId });
					setCurrentRemixId(null);
					setGeneratingPrefabs(new Set());

					if (job.status === "succeeded") {
						onComplete?.({ successCount: completed, failCount: failed });
					} else {
						const failedTask = tasks.find((t) => t.status === "failed");
						onError?.(failedTask?.errorMessage ?? "Generation failed");
					}
				}
			} catch (err) {
				console.error("[useAssetGeneration] Poll error:", err);
			}
		},
		[utils, gameId, stopPolling, onComplete, onError],
	);

	useEffect(() => {
		return () => {
			stopPolling();
		};
	}, [stopPolling]);

	const generateAll = useCallback(
		async (params: {
			remixId?: string;
			prefabIds: string[];
			themePrompt?: string;
			style?: string;
			removeBackground?: boolean;
		}) => {
			if (params.prefabIds.length === 0) {
				onError?.("No templates to generate");
				return;
			}

			setError(null);
			setGeneratingPrefabs(new Set(params.prefabIds));
			setCurrentRemixId(params.remixId ?? null);
			setStatus("creating-job");
			setProgress({ total: params.prefabIds.length, completed: 0, failed: 0 });

			try {
				const { jobId } = await createJobMutation.mutateAsync({
					gameId,
					remixId: params.remixId,
					prefabIds: params.prefabIds,
					promptDefaults: {
						themePrompt: params.themePrompt,
						styleOverride: params.style,
						removeBackground: params.removeBackground,
					},
				});

				setCurrentJobId(jobId);
				setStatus("generating");

				processJobMutation.mutate({ jobId });

				stopPolling();
				pollIntervalRef.current = setInterval(() => {
					pollJobStatus(jobId, params.remixId ?? null);
				}, POLL_INTERVAL_MS);

				setTimeout(() => {
					pollJobStatus(jobId, params.remixId ?? null);
				}, 500);
			} catch (err) {
				setGeneratingPrefabs(new Set());
				setCurrentRemixId(null);
				setStatus("failed");
				const message =
					err instanceof Error ? err.message : "Failed to create job";
				setError(message);
				onError?.(message);
			}
		},
		[
			gameId,
			createJobMutation,
			processJobMutation,
			stopPolling,
			pollJobStatus,
			onError,
		],
	);

	const reset = useCallback(() => {
		stopPolling();
		setGeneratingPrefabs(new Set());
		setCurrentJobId(null);
		setCurrentRemixId(null);
		setStatus("idle");
		setProgress({ total: 0, completed: 0, failed: 0 });
		setError(null);
		createJobMutation.reset();
		processJobMutation.reset();
	}, [stopPolling, createJobMutation, processJobMutation]);

	return {
		status,
		jobId: currentJobId,
		progress,
		error,
		generatingTemplates,
		isGenerating: status === "creating-job" || status === "generating",
		generateAll,
		reset,
	};
}

export function useRemixes(gameId: string) {
	return trpcReact.assetSystem.remixes.listRemixes.useQuery({ gameId });
}

export function useRemix(gameId: string, remixId?: string) {
	return trpcReact.assetSystem.remixes.getResolvedRemix.useQuery(
		{ gameId, remixId: remixId! },
		{ enabled: !!remixId },
	);
}

export function useCreateRemix() {
	const utils = trpcReact.useUtils();
	return trpcReact.assetSystem.remixes.createRemix.useMutation({
		onSuccess: (data, variables) => {
			utils.assetSystem.remixes.listRemixes.invalidate({
				gameId: variables.gameId,
			});
		},
	});
}

export function useDeleteRemix() {
	const utils = trpcReact.useUtils();
	return trpcReact.assetSystem.remixes.deleteRemix.useMutation({
		onSuccess: () => {
			utils.assetSystem.remixes.listRemixes.invalidate();
		},
	});
}

export function useUpdateRemix() {
	const utils = trpcReact.useUtils();
	return trpcReact.assetSystem.remixes.updateRemix.useMutation({
		onSuccess: (data, variables) => {
			utils.assetSystem.remixes.getResolvedRemix.invalidate();
			utils.assetSystem.remixes.listRemixes.invalidate();
		},
	});
}
