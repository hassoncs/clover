import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { env } from "../lib/env";
import { trpc } from "../lib/trpc";

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
};

const SKIP_VOICE_CONTENT_TYPES = new Set(["headsup", "wordlist", "FakeWord"]);

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
			onClick={() => generate.mutate({ contentIds: [contentId] })}
			disabled={generate.isPending}
			className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-300 cursor-pointer disabled:opacity-50"
		>
			{generate.isPending ? "..." : "Gen"}
		</button>
	);
}

function StarRating({
	value,
	onRate,
}: {
	value: number | null;
	onRate: (score: number) => void;
}) {
	return (
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
		type: "quality" | "humor",
		score: number,
		current: { qualityScore: number | null; humorScore: number | null } | null,
	) => {
		upsertReview.mutate({
			contentId,
			qualityScore: type === "quality" ? score : (current?.qualityScore ?? 1),
			humorScore: type === "humor" ? score : (current?.humorScore ?? 1),
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
				<div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
					<h1 className="m-0 text-xl font-bold text-slate-50">
						Content Review
					</h1>
					<div className="flex items-center gap-4">
						{missingIds.length > 0 && (
							<button
								type="button"
								onClick={() => generateAudio.mutate({ contentIds: missingIds })}
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
									{[
										{ label: "ID", width: "w-[60px]" },
										{ label: "B", width: "w-[28px]", title: "Brand" },
										{ label: "Type", width: "w-[50px]" },
										{ label: "", width: "w-[24px]", title: "Status" },
										{ label: "Content", width: "" },
										{ label: "♪", width: "w-[32px]", title: "Audio" },
										{ label: "Qual", width: "w-[80px]", title: "Quality" },
										{ label: "Fun", width: "w-[80px]", title: "Humor" },
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
								{data.items.map((item) => (
									<tr
										key={item.id}
										className={`border-b border-slate-900 hover:bg-slate-900/50 ${
											item.deletedAt ? "bg-red-900/10" : ""
										}`}
									>
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
											{item.assets?.[0]?.r2_key ? (
												<AudioButton r2Key={item.assets[0].r2_key} />
											) : SKIP_VOICE_CONTENT_TYPES.has(item.contentType) ? (
												<span className="text-slate-700">—</span>
											) : (
												<div className="flex items-center justify-center gap-1">
													<span
														title="Missing audio"
														className="text-amber-500 text-sm"
													>
														⚠
													</span>
													<GenerateRowButton contentId={item.id} />
												</div>
											)}
										</td>
										<td className="px-3.5 py-2.5">
											<StarRating
												value={item.latestReview?.qualityScore ?? null}
												onRate={(s) =>
													handleRate(item.id, "quality", s, item.latestReview)
												}
											/>
										</td>
										<td className="px-3.5 py-2.5">
											<StarRating
												value={item.latestReview?.humorScore ?? null}
												onRate={(s) =>
													handleRate(item.id, "humor", s, item.latestReview)
												}
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
								))}
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
