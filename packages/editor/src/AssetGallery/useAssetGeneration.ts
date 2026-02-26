import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorTRPC } from "../editor-context";

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

interface GenerationTask {
	status: "pending" | "running" | "succeeded" | "failed";
	prefabId: string;
	errorMessage?: string;
}

export function useAssetGeneration({
	gameId,
	onComplete,
	onError,
}: UseAssetGenerationOptions) {
	const trpcReact = useEditorTRPC();
	const [generatingTemplates, setGeneratingPrefabs] = useState<Set<string>>(
		new Set(),
	);
	const [currentJobId, setCurrentJobId] = useState<string | null>(null);
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
			onError: (err: { message: string }) => {
				setGeneratingPrefabs(new Set());
				setStatus("failed");
				const message = err.message;
				setError(message);
				onError?.(message);
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
		async (jobId: string) => {
			try {
				const job = await utils.assetSystem.getJob.fetch({ id: jobId });

				const tasks = (job.tasks ?? []) as GenerationTask[];
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

				lastCompletedCountRef.current = completed;

				if (job.status === "succeeded" || job.status === "failed") {
					stopPolling();
					setCurrentJobId(null);
					setStatus(job.status);
					lastCompletedCountRef.current = 0;
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
		[utils, stopPolling, onComplete, onError],
	);

	useEffect(() => {
		return () => {
			stopPolling();
		};
	}, [stopPolling]);

	const generateAll = useCallback(
		async (params: {
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
			setStatus("creating-job");
			setProgress({ total: params.prefabIds.length, completed: 0, failed: 0 });

			try {
				const { jobId } = await createJobMutation.mutateAsync({
					gameId,
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
					pollJobStatus(jobId);
				}, POLL_INTERVAL_MS);

				setTimeout(() => {
					pollJobStatus(jobId);
				}, 500);
			} catch (err) {
				setGeneratingPrefabs(new Set());
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
