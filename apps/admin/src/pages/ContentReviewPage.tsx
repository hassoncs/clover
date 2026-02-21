import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { env } from "../lib/env";
import { trpc } from "../lib/trpc";

const AI_MODELS = [
	{ label: "Kimi K2.5", value: "moonshotai/kimi-k2.5" },
	{ label: "Claude Sonnet 4.6", value: "anthropic/claude-sonnet-4-6" },
	{ label: "Claude Sonnet 4.5", value: "anthropic/claude-sonnet-4-5" },
	{ label: "GPT-4.1", value: "openai/gpt-4.1" },
	{ label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash-preview-05-20" },
	{ label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash-001" },
	{ label: "GPT-4o Mini", value: "openai/gpt-4o-mini" },
];

const CONTENT_TYPES = [
	{ label: "Quip", value: "quip" },
	{ label: "Trivia", value: "trivia" },
	{ label: "Drawing", value: "drawing" },
	{ label: "Dilemma", value: "dilemma" },
	{ label: "WYR", value: "wyr" },
	{ label: "Estimation", value: "estimation" },
	{ label: "Fibbage", value: "fibbage" },
	{ label: "Caption", value: "caption" },
	{ label: "Wordgame", value: "wordgame" },
	{ label: "Wordlist", value: "wordlist" },
	{ label: "Personal", value: "personal" },
	{ label: "FakeWord", value: "FakeWord" },
	{ label: "Ranking", value: "ranking" },
	{ label: "HeadsUp", value: "headsup" },
	{ label: "Chroma", value: "chroma" },
];

const TYPE_ABBREVIATIONS: Record<string, string> = {
	quip: "QIP",
	trivia: "TRV",
	drawing: "DRW",
	dilemma: "DIL",
	wyr: "WYR",
	estimation: "EST",
	fibbage: "FIB",
	caption: "CAP",
	wordgame: "WDG",
	wordlist: "WDL",
	personal: "PRS",
	FakeWord: "FKW",
	ranking: "RNK",
	headsup: "HU",
	chroma: "CHR",
};

const SKIP_VOICE_CONTENT_TYPES = new Set([
	"headsup",
	"wordlist",
	"FakeWord",
	"chroma",
]);

function ContentBody({
	body,
	contentType,
}: {
	body: string;
	contentType: string;
}) {
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(body);
	} catch {
		return <span className="text-slate-200">{body.slice(0, 120)}</span>;
	}

	switch (contentType) {
		case "quip":
		case "personal":
			return (
				<span className="text-slate-200">{String(parsed.text ?? "")}</span>
			);

		case "trivia":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-slate-200 font-medium">
						{String(parsed.question ?? "")}
					</span>
					<span className="text-green-300 text-xs">
						✓ {String(parsed.correctAnswer ?? "")}
					</span>
					{Array.isArray(parsed.incorrectAnswers) && (
						<span className="text-slate-500 text-[11px]">
							{(parsed.incorrectAnswers as string[]).join(" · ")}
						</span>
					)}
				</div>
			);

		case "fibbage":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-slate-200 font-medium">
						{String(parsed.question ?? "")}
					</span>
					<span className="text-amber-400 text-xs">
						→ {String(parsed.answer ?? "")}
					</span>
				</div>
			);

		case "dilemma":
		case "wyr":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-blue-300">
						A: {String(parsed.optionA ?? "")}
					</span>
					<span className="text-rose-300">
						B: {String(parsed.optionB ?? "")}
					</span>
				</div>
			);

		case "drawing":
			return (
				<span className="text-slate-200">🎨 {String(parsed.prompt ?? "")}</span>
			);

		case "ranking":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-slate-200 font-medium">
						{String(parsed.topic ?? "")}
					</span>
					{Array.isArray(parsed.items) && (
						<span className="text-slate-500 text-[11px]">
							{(parsed.items as string[]).join(" → ")}
						</span>
					)}
				</div>
			);

		case "headsup":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-slate-200 font-medium">
						{String(parsed.name ?? "")}
					</span>
					{Array.isArray(parsed.words) && (
						<span className="text-slate-500 text-[11px]">
							{(parsed.words as string[]).slice(0, 6).join(", ")}
							{(parsed.words as string[]).length > 6 ? " ..." : ""}
						</span>
					)}
				</div>
			);

		case "wordlist":
			return (
				<span className="text-slate-200">{String(parsed.word ?? "")}</span>
			);

		case "estimation":
			return (
				<div className="flex flex-col gap-1">
					<span className="text-slate-200 font-medium">
						{String(parsed.question ?? "")}
					</span>
					{parsed.answer != null && (
						<span className="text-amber-400 text-xs">
							= {String(parsed.answer)}
						</span>
					)}
				</div>
			);

		default: {
			const text =
				parsed.text ??
				parsed.question ??
				parsed.prompt ??
				parsed.word ??
				JSON.stringify(parsed);
			const s = String(text);
			return (
				<span className="text-slate-200">
					{s.slice(0, 120)}
					{s.length > 120 ? "..." : ""}
				</span>
			);
		}
	}
}

function AudioButton({ r2Key }: { r2Key: string }) {
	const [state, setState] = useState<"idle" | "playing" | "error">("idle");
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const toggle = useCallback(() => {
		if (state === "playing" && audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
			setState("idle");
			return;
		}
		const audio = new Audio(`${env.apiUrl}/assets/${r2Key}`);
		audioRef.current = audio;
		setState("playing");
		audio.play().catch(() => setState("error"));
		audio.addEventListener("ended", () => {
			audioRef.current = null;
			setState("idle");
		});
		audio.addEventListener("error", () => {
			audioRef.current = null;
			setState("error");
		});
	}, [state, r2Key]);

	if (state === "error") {
		return (
			<span className="text-amber-500 text-sm" title="Audio file missing">
				⚠
			</span>
		);
	}

	return (
		<button
			type="button"
			onClick={toggle}
			className={`cursor-pointer text-[15px] p-0 border-none bg-transparent ${
				state === "playing"
					? "text-amber-400"
					: "text-slate-400 hover:text-slate-300"
			}`}
			title={state === "playing" ? "Pause" : "Play"}
		>
			{state === "playing" ? "⏸" : "▶"}
		</button>
	);
}

function GenerateRowButton({ contentId }: { contentId: string }) {
	const utils = trpc.useUtils();
	const generate = trpc.partyContent.generateAudio.useMutation({
		onSuccess: () => utils.partyContent.list.invalidate(),
	});

	return (
		<button
			type="button"
			onClick={() =>
				generate.mutate({ contentIds: [contentId], provider: "scenario" })
			}
			disabled={generate.isPending}
			className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-300 cursor-pointer disabled:opacity-50"
		>
			{generate.isPending ? "..." : "Gen"}
		</button>
	);
}

function StarRating({
	value,
	avgValue,
	reviewCount,
	onRate,
}: {
	value: number | null;
	avgValue: number | null;
	reviewCount: number;
	onRate: (score: number) => void;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="flex">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						type="button"
						key={star}
						onClick={() => onRate(star)}
						className={`cursor-pointer text-[15px] px-[1px] border-none bg-transparent ${
							star <= (value ?? 0)
								? "text-amber-400"
								: "text-slate-700 hover:text-slate-600"
						}`}
					>
						★
					</button>
				))}
			</span>
			{reviewCount > 0 && (
				<span className="text-[10px] text-slate-500 pl-[1px]">
					{avgValue !== null ? `avg ${avgValue.toFixed(1)}` : "—"}
					{reviewCount > 1 && (
						<span className="text-slate-600 ml-1">({reviewCount})</span>
					)}
				</span>
			)}
		</div>
	);
}

function AiReviewModal({
	selectedIds,
	onClose,
	onComplete,
}: {
	selectedIds: Set<string>;
	onClose: () => void;
	onComplete: () => void;
}) {
	const [selectedModels, setSelectedModels] = useState<string[]>([
		AI_MODELS[0].value,
	]);
	const [dimensions, setDimensions] = useState<("quality" | "humor")[]>([
		"quality",
		"humor",
	]);
	const [progress, setProgress] = useState<string[]>([]);
	const [isRunning, setIsRunning] = useState(false);

	const aiReview = trpc.partyContent.aiReview.useMutation();

	const toggleDimension = (dim: "quality" | "humor") => {
		setDimensions((prev) =>
			prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim],
		);
	};

	const toggleModel = (value: string) => {
		setSelectedModels((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
		);
	};

	const handleRun = async () => {
		if (selectedModels.length === 0) return;
		setIsRunning(true);
		setProgress([]);

		for (const model of selectedModels) {
			const modelLabel =
				AI_MODELS.find((m) => m.value === model)?.label ?? model;

			setProgress((prev) => [...prev, `Running ${modelLabel}...`]);

			try {
				const result = await aiReview.mutateAsync({
					contentIds: Array.from(selectedIds),
					model,
					dimensions,
				});

				setProgress((prev) => {
					const next = [...prev];
					const errorNote =
						result.errors.length > 0 ? ` (${result.errors.length} errors)` : "";
					next[next.length - 1] =
						`✓ ${modelLabel}: ${result.reviewed} reviewed${errorNote}`;
					return next;
				});
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				setProgress((prev) => {
					const next = [...prev];
					next[next.length - 1] = `✗ ${modelLabel}: ${msg}`;
					return next;
				});
			}
		}

		setIsRunning(false);
		setTimeout(() => {
			onComplete();
			onClose();
		}, 1000);
	};

	return (
		<div className="fixed inset-0 z-50">
			<button
				type="button"
				aria-label="Close modal"
				className="absolute inset-0 bg-black/70 w-full h-full border-none cursor-default"
				onClick={!isRunning ? onClose : undefined}
			/>
			<div
				role="dialog"
				aria-modal="true"
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-xl p-6 w-[420px] flex flex-col gap-4 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between">
					<h3 className="text-slate-50 font-semibold text-base m-0">
						AI Review — {selectedIds.size} item
						{selectedIds.size !== 1 ? "s" : ""}
					</h3>
					{!isRunning && (
						<button
							type="button"
							onClick={onClose}
							className="text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer text-lg p-0"
						>
							✕
						</button>
					)}
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
						Models
					</span>
					<div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto border border-slate-800 rounded p-2 bg-slate-950/30">
						{AI_MODELS.map((m) => (
							<label
								key={m.value}
								className="flex items-center gap-2.5 cursor-pointer text-slate-300 text-sm hover:bg-slate-800/50 p-1.5 rounded transition-colors"
							>
								<input
									type="checkbox"
									checked={selectedModels.includes(m.value)}
									onChange={() => toggleModel(m.value)}
									disabled={isRunning}
									className="rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-0 focus:ring-offset-0"
								/>
								{m.label}
							</label>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
						Dimensions
					</span>
					<div className="flex gap-4">
						{(["quality", "humor"] as const).map((dim) => (
							<label
								key={dim}
								className="flex items-center gap-2 cursor-pointer text-slate-300 text-sm"
							>
								<input
									type="checkbox"
									checked={dimensions.includes(dim)}
									onChange={() => toggleDimension(dim)}
									disabled={isRunning}
									className="rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-0 focus:ring-offset-0"
								/>
								{dim.charAt(0).toUpperCase() + dim.slice(1)}
							</label>
						))}
					</div>
				</div>

				{progress.length > 0 && (
					<div className="flex flex-col gap-1 text-[11px] font-mono bg-slate-950 p-3 rounded border border-slate-800 max-h-[120px] overflow-y-auto">
						{progress.map((line, i) => (
							<div
								key={i}
								className={
									line.startsWith("✗")
										? "text-red-400"
										: line.startsWith("✓")
											? "text-emerald-400"
											: "text-slate-400 animate-pulse"
								}
							>
								{line}
							</div>
						))}
					</div>
				)}

				<div className="flex gap-2 justify-end mt-2">
					<button
						type="button"
						onClick={onClose}
						disabled={isRunning}
						className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm cursor-pointer hover:bg-slate-700 disabled:opacity-50 disabled:cursor-default"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={
							isRunning ||
							dimensions.length === 0 ||
							selectedModels.length === 0
						}
						onClick={handleRun}
						className="px-4 py-1.5 bg-violet-800 hover:bg-violet-700 border border-violet-600 rounded text-violet-100 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors min-w-[100px]"
					>
						{isRunning
							? "Running..."
							: `Run ${selectedModels.length} Model${selectedModels.length !== 1 ? "s" : ""}`}
					</button>
				</div>
			</div>
		</div>
	);
}

export function ContentReviewPage() {
	const [params, setParams] = useSearchParams();

	const brand = (params.get("brand") as "amen" | "slopcade") || undefined;
	const contentType = params.get("type") || undefined;
	const status =
		(params.get("status") as "draft" | "active" | "retired") || undefined;
	const search = params.get("q") ?? "";
	const includeDeleted = params.get("deleted") === "1";
	const hasReview =
		(params.get("review") as "all" | "reviewed" | "unreviewed") || "all";
	const sortBy =
		(params.get("sort") as
			| "created_at"
			| "updated_at"
			| "quality_score"
			| "humor_score") || "created_at";
	const sortOrder = (params.get("order") as "asc" | "desc") || "desc";
	const page = Number(params.get("page")) || 1;
	const pageSize = 50;

	const setFilter = useCallback(
		(updates: Record<string, string | undefined>) => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					for (const [k, v] of Object.entries(updates)) {
						if (v == null || v === "" || v === "all" || v === "0")
							next.delete(k);
						else next.set(k, v);
					}
					if (!("page" in updates)) next.delete("page");
					return next;
				},
				{ replace: true },
			);
		},
		[setParams],
	);

	const setPage = useCallback(
		(p: number | ((prev: number) => number)) => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					const val =
						typeof p === "function" ? p(Number(prev.get("page")) || 1) : p;
					if (val <= 1) next.delete("page");
					else next.set("page", String(val));
					return next;
				},
				{ replace: true },
			);
		},
		[setParams],
	);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showAiModal, setShowAiModal] = useState(false);

	const utils = trpc.useUtils();

	const { data, isLoading, error } = trpc.partyContent.list.useQuery(
		{
			page,
			pageSize,
			brand,
			contentType,
			status,
			search,
			includeDeleted,
			hasReview:
				hasReview === "reviewed"
					? true
					: hasReview === "unreviewed"
						? false
						: undefined,
			sortBy,
			sortOrder,
		},
		{ retry: false },
	);

	const toggleSelection = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const toggleAll = useCallback(() => {
		if (!data?.items) return;
		setSelectedIds((prev) => {
			if (prev.size === data.items.length) return new Set();
			return new Set(data.items.map((i) => i.id));
		});
	}, [data?.items]);

	const { data: snapshots } = trpc.partyContent.listSnapshots.useQuery();

	const importPacks = trpc.partyContent.importPacks.useMutation({
		onSuccess: () => {
			utils.partyContent.list.invalidate();
			alert("Packs imported successfully!");
		},
	});

	const publishSnapshot = trpc.partyContent.publish.useMutation({
		onSuccess: (data) => {
			utils.partyContent.listSnapshots.invalidate();
			alert(`Snapshot published: v${data.version}`);
		},
	});

	const upsertReview = trpc.partyContent.upsertReview.useMutation({
		onSuccess: () => utils.partyContent.list.invalidate(),
	});

	const softDelete = trpc.partyContent.softDelete.useMutation({
		onSuccess: () => utils.partyContent.list.invalidate(),
	});

	const generateAudio = trpc.partyContent.generateAudio.useMutation({
		onSuccess: () => utils.partyContent.list.invalidate(),
	});

	const handleRate = (
		contentId: string,
		dimension: "quality" | "humor",
		score: number,
	) => {
		upsertReview.mutate({
			contentId,
			qualityScore: dimension === "quality" ? score : undefined,
			humorScore: dimension === "humor" ? score : undefined,
		});
	};

	const handleDelete = (id: string) => {
		if (confirm("Delete this content?")) softDelete.mutate({ id });
	};

	if (error) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-red-500">
					{error.data?.code === "FORBIDDEN"
						? "Access Denied: You are not an admin."
						: error.data?.code === "UNAUTHORIZED"
							? "Please sign in."
							: `Error: ${error.message}`}
				</p>
			</div>
		);
	}

	const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

	const missingAudioItems =
		data?.items.filter(
			(item) =>
				!item.assets?.[0]?.r2_key &&
				!SKIP_VOICE_CONTENT_TYPES.has(item.contentType),
		) ?? [];
	const missingIds = missingAudioItems.map((item) => item.id);

	return (
		<div className="flex h-full overflow-hidden bg-slate-950">
			{showAiModal && (
				<AiReviewModal
					selectedIds={selectedIds}
					onClose={() => setShowAiModal(false)}
					onComplete={() => {
						utils.partyContent.list.invalidate();
						setSelectedIds(new Set());
					}}
				/>
			)}

			{/* Sidebar */}
			<div className="w-64 shrink-0 bg-slate-800 border-r border-slate-700 p-5 overflow-y-auto flex flex-col gap-3.5">
				<h2 className="m-0 text-[15px] font-bold text-slate-50">Filters</h2>

				<div>
					<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
						Search
					</div>
					<input
						value={search}
						onChange={(e) => setFilter({ q: e.target.value })}
						placeholder="Search content..."
						className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-50 text-sm outline-none focus:border-slate-500 placeholder:text-slate-600"
					/>
				</div>

				<div>
					<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
						Brand
					</div>
					<select
						value={brand ?? ""}
						onChange={(e) => setFilter({ brand: e.target.value })}
						className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
					>
						<option value="">All</option>
						<option value="amen">Amen</option>
						<option value="slopcade">Slopcade</option>
					</select>
				</div>

				<div>
					<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
						Type
					</div>
					<select
						value={contentType ?? ""}
						onChange={(e) => setFilter({ type: e.target.value })}
						className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
					>
						<option value="">All</option>
						{CONTENT_TYPES.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</div>

				<div>
					<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
						Status
					</div>
					<select
						value={status ?? ""}
						onChange={(e) => setFilter({ status: e.target.value })}
						className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
					>
						<option value="">All</option>
						<option value="draft">Draft</option>
						<option value="active">Active</option>
						<option value="retired">Retired</option>
					</select>
				</div>

				<div>
					<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
						Review Status
					</div>
					<select
						value={hasReview}
						onChange={(e) => setFilter({ review: e.target.value })}
						className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
					>
						<option value="all">All</option>
						<option value="reviewed">Reviewed</option>
						<option value="unreviewed">Unreviewed</option>
					</select>
				</div>

				<div className="flex gap-2">
					<div className="flex-1">
						<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
							Sort By
						</div>
						<select
							value={sortBy}
							onChange={(e) => setFilter({ sort: e.target.value })}
							className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
						>
							<option value="created_at">Created</option>
							<option value="updated_at">Updated</option>
							<option value="quality_score">Quality</option>
							<option value="humor_score">Humor</option>
						</select>
					</div>
					<div className="flex-1">
						<div className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
							Order
						</div>
						<select
							value={sortOrder}
							onChange={(e) => setFilter({ order: e.target.value })}
							className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-slate-500"
						>
							<option value="desc">Desc</option>
							<option value="asc">Asc</option>
						</select>
					</div>
				</div>

				<label className="flex items-center gap-2 cursor-pointer text-slate-400 text-[13px] hover:text-slate-300">
					<input
						type="checkbox"
						checked={includeDeleted}
						onChange={(e) =>
							setFilter({ deleted: e.target.checked ? "1" : undefined })
						}
						className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
					/>
					Include Deleted
				</label>
			</div>

			{/* Main */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="px-6 py-3.5 border-b border-slate-800 flex items-center gap-4 shrink-0 bg-slate-900/50">
					<button
						type="button"
						onClick={() => importPacks.mutate({ brands: ["amen", "slopcade"] })}
						disabled={importPacks.isPending}
						className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-900 border border-blue-700/50 rounded text-blue-200 text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors"
					>
						{importPacks.isPending ? "Importing..." : "Import Packs"}
					</button>
					<button
						type="button"
						onClick={() => publishSnapshot.mutate()}
						disabled={publishSnapshot.isPending}
						className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-900 border border-purple-700/50 rounded text-purple-200 text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors"
					>
						{publishSnapshot.isPending ? "Publishing..." : "Publish Snapshot"}
					</button>
					{snapshots && snapshots.length > 0 && (
						<span className="text-slate-400 text-xs font-mono">
							Current: v{snapshots[0].version}
						</span>
					)}
				</div>

				<div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
					<h1 className="m-0 text-xl font-bold text-slate-50">
						Content Review
					</h1>
					<div className="flex items-center gap-4">
						{selectedIds.size > 0 && (
							<>
								<button
									type="button"
									onClick={() => setShowAiModal(true)}
									className="px-3 py-1.5 bg-violet-900/50 hover:bg-violet-900 border border-violet-700/50 rounded text-violet-200 text-xs font-medium cursor-pointer transition-colors"
								>
									🤖 AI Review {selectedIds.size} Selected
								</button>
								<button
									type="button"
									onClick={() =>
										generateAudio.mutate({
											contentIds: Array.from(selectedIds),
											provider: "scenario",
										})
									}
									disabled={generateAudio.isPending}
									className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-700/50 rounded text-emerald-200 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors"
								>
									{generateAudio.isPending
										? "Generating..."
										: `Generate ${selectedIds.size} Selected`}
								</button>
							</>
						)}
						{missingIds.length > 0 && (
							<button
								type="button"
								onClick={() =>
									generateAudio.mutate({
										contentIds: missingIds,
										provider: "scenario",
									})
								}
								disabled={generateAudio.isPending}
								className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-700/50 rounded text-emerald-200 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors"
							>
								{generateAudio.isPending
									? "Generating..."
									: `Generate ${missingIds.length} Missing`}
							</button>
						)}
						{data && (
							<span className="text-slate-500 text-[13px]">
								{data.total} items · page {page} of {totalPages || 1}
							</span>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-6 pb-6">
					{isLoading ? (
						<p className="text-slate-500 py-6">Loading...</p>
					) : !data?.items.length ? (
						<p className="text-slate-500 italic py-6">No content found.</p>
					) : (
						<table className="w-full border-collapse text-slate-300 text-[13px]">
							<thead>
								<tr className="border-b border-slate-800">
									<th className="px-3.5 py-2 text-left w-[24px]">
										<input
											type="checkbox"
											checked={
												(data?.items.length ?? 0) > 0 &&
												selectedIds.size === data?.items.length
											}
											onChange={toggleAll}
											className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
										/>
									</th>
									{[
										{ label: "ID", width: "w-[60px]" },
										{ label: "B", width: "w-[28px]", title: "Brand" },
										{ label: "Type", width: "w-[50px]" },
										{ label: "", width: "w-[24px]", title: "Status" },
										{ label: "Content", width: "" },
										{ label: "♪", width: "w-[32px]", title: "Audio" },
										{
											label: "Qual",
											width: "w-[90px]",
											title: "Quality (your rating + avg)",
										},
										{
											label: "Fun",
											width: "w-[90px]",
											title: "Humor (your rating + avg)",
										},
										{ label: "", width: "w-[50px]" },
									].map((h) => (
										<th
											key={h.label + (h.title ?? "")}
											title={h.title}
											className={`px-1.5 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${h.width}`}
										>
											{h.label}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.items.map((item) => {
									const audioAsset =
										item.assets?.find((a) => a.asset_type === "audio") ??
										item.assets?.[0];
									return (
										<tr
											key={item.id}
											className={`border-b border-slate-900 hover:bg-slate-900/50 ${
												item.deletedAt ? "bg-red-900/10" : ""
											}`}
										>
											<td className="p-3.5">
												<input
													type="checkbox"
													checked={selectedIds.has(item.id)}
													onChange={() => toggleSelection(item.id)}
													className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
												/>
											</td>
											<td className="p-3.5">
												<code className="font-mono text-slate-500 text-[11px]">
													{item.id.slice(0, 8)}
												</code>
											</td>
											<td className="p-3.5">
												<div
													className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
														item.brandId === "amen"
															? "bg-blue-900 text-blue-200"
															: "bg-violet-900 text-violet-200"
													}`}
													title={item.brandId}
												>
													{item.brandId === "amen" ? "A" : "S"}
												</div>
											</td>
											<td className="p-3.5">
												<span className="text-[10px] font-mono text-slate-400 uppercase">
													{TYPE_ABBREVIATIONS[item.contentType] ??
														item.contentType.slice(0, 3)}
												</span>
											</td>
											<td className="p-3.5">
												<div
													className={`w-2 h-2 rounded-full ${
														item.status === "active"
															? "bg-green-500"
															: item.status === "draft"
																? "bg-amber-500"
																: "bg-zinc-600"
													}`}
													title={item.status}
												/>
											</td>
											<td className="p-3.5 max-w-md break-words">
												<ContentBody
													body={item.body}
													contentType={item.contentType}
												/>
											</td>
											<td className="p-3.5 text-center">
												{SKIP_VOICE_CONTENT_TYPES.has(item.contentType) ? (
													<span className="text-slate-700">—</span>
												) : (
													<div className="flex items-center justify-center gap-1">
														{audioAsset?.r2_key ? (
															<AudioButton r2Key={audioAsset.r2_key} />
														) : (
															<span
																title="Audio file missing"
																className="text-amber-500 text-sm"
															>
																⚠
															</span>
														)}
														<GenerateRowButton contentId={item.id} />
													</div>
												)}
											</td>
											<td className="px-3.5 py-2.5">
												<StarRating
													value={item.myReview?.qualityScore ?? null}
													avgValue={item.avgQuality ?? null}
													reviewCount={item.reviewCount ?? 0}
													onRate={(s) => handleRate(item.id, "quality", s)}
												/>
											</td>
											<td className="px-3.5 py-2.5">
												<StarRating
													value={item.myReview?.humorScore ?? null}
													avgValue={item.avgHumor ?? null}
													reviewCount={item.reviewCount ?? 0}
													onRate={(s) => handleRate(item.id, "humor", s)}
												/>
											</td>
											<td className="p-3.5">
												<button
													type="button"
													onClick={() => handleDelete(item.id)}
													disabled={!!item.deletedAt}
													className={`bg-transparent border-none cursor-pointer text-red-400 text-[13px] p-0 hover:text-red-300 ${
														item.deletedAt ? "opacity-35 cursor-default" : ""
													}`}
												>
													{item.deletedAt ? "Deleted" : "Delete"}
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{data && (
					<div className="px-6 py-3 border-t border-slate-800 flex justify-center gap-3 shrink-0">
						<button
							type="button"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm disabled:opacity-40 disabled:cursor-default hover:not-disabled:bg-slate-700 cursor-pointer"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= totalPages}
							className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm disabled:opacity-40 disabled:cursor-default hover:not-disabled:bg-slate-700 cursor-pointer"
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
