import { useState } from "react";
import { trpc } from "../lib/trpc";
import { env } from "../lib/env";

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

function getBodyPreview(body: string): string {
	try {
		const parsed = JSON.parse(body);
		const text =
			parsed.text ??
			parsed.question ??
			parsed.prompt ??
			parsed.topic ??
			parsed.word ??
			JSON.stringify(parsed);
		const s = String(text);
		return s.slice(0, 80) + (s.length > 80 ? "..." : "");
	} catch {
		return body.slice(0, 80) + (body.length > 80 ? "..." : "");
	}
}

function StarRating({
	value,
	onRate,
}: {
	value: number | null;
	onRate: (score: number) => void;
}) {
	return (
		<span>
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					onClick={() => onRate(star)}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						fontSize: 15,
						color: star <= (value ?? 0) ? "#fbbf24" : "#334155",
						padding: "0 1px",
					}}
				>
					★
				</button>
			))}
		</span>
	);
}

function Badge({
	color,
	text,
	textColor = "#bfdbfe",
}: {
	color: string;
	text: string;
	textColor?: string;
}) {
	return (
		<span
			style={{
				display: "inline-block",
				padding: "2px 8px",
				borderRadius: 4,
				background: color,
				color: textColor,
				fontSize: 11,
				fontWeight: 600,
				whiteSpace: "nowrap",
			}}
		>
			{text}
		</span>
	);
}

const selectStyle: React.CSSProperties = {
	width: "100%",
	padding: "8px 10px",
	borderRadius: 6,
	border: "1px solid #334155",
	background: "#0f172a",
	color: "#cbd5e1",
	fontSize: 13,
	outline: "none",
};

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: 10,
	fontWeight: 600,
	color: "#64748b",
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 5,
};

function FilterSelect({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
}) {
	return (
		<div>
			<label style={labelStyle}>{label}</label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				style={selectStyle}
			>
				<option value="">All</option>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</div>
	);
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
	return {
		padding: "6px 16px",
		background: disabled ? "transparent" : "#1e293b",
		border: "1px solid #334155",
		borderRadius: 6,
		color: "#cbd5e1",
		cursor: disabled ? "default" : "pointer",
		opacity: disabled ? 0.4 : 1,
		fontSize: 13,
	};
}

export function ContentReviewPage() {
	const [brand, setBrand] = useState<"amen" | "slopcade" | undefined>();
	const [contentType, setContentType] = useState<string | undefined>();
	const [status, setStatus] = useState<
		"draft" | "active" | "retired" | undefined
	>();
	const [search, setSearch] = useState("");
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [hasReview, setHasReview] = useState<
		"all" | "reviewed" | "unreviewed"
	>("all");
	const [sortBy, setSortBy] = useState<
		"created_at" | "updated_at" | "quality_score" | "humor_score"
	>("created_at");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [page, setPage] = useState(1);
	const pageSize = 50;

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

	const playAudio = (r2Key: string) => {
		new Audio(`${env.apiUrl}/assets/${r2Key}`)
			.play()
			.catch(console.error);
	};

	if (error) {
		return (
			<div
				style={{
					display: "flex",
					height: "100%",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<p style={{ color: "#ef4444" }}>
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

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				overflow: "hidden",
				background: "#0f172a",
			}}
		>
			{/* Sidebar */}
			<div
				style={{
					width: 256,
					flexShrink: 0,
					background: "#1e293b",
					borderRight: "1px solid #334155",
					padding: 20,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					gap: 14,
				}}
			>
				<h2
					style={{
						margin: 0,
						fontSize: 15,
						fontWeight: 700,
						color: "#f8fafc",
					}}
				>
					Filters
				</h2>

				<div>
					<label style={labelStyle}>Search</label>
					<input
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="Search content..."
						style={{ ...selectStyle, color: "#f8fafc" }}
					/>
				</div>

				<FilterSelect
					label="Brand"
					value={brand ?? ""}
					onChange={(v) => {
						setBrand((v as "amen" | "slopcade") || undefined);
						setPage(1);
					}}
					options={[
						{ label: "Amen", value: "amen" },
						{ label: "Slopcade", value: "slopcade" },
					]}
				/>

				<FilterSelect
					label="Type"
					value={contentType ?? ""}
					onChange={(v) => {
						setContentType(v || undefined);
						setPage(1);
					}}
					options={CONTENT_TYPES}
				/>

				<FilterSelect
					label="Status"
					value={status ?? ""}
					onChange={(v) => {
						setStatus((v as "draft" | "active" | "retired") || undefined);
						setPage(1);
					}}
					options={[
						{ label: "Draft", value: "draft" },
						{ label: "Active", value: "active" },
						{ label: "Retired", value: "retired" },
					]}
				/>

				<FilterSelect
					label="Review Status"
					value={hasReview}
					onChange={(v) => {
						setHasReview(
							(v as "all" | "reviewed" | "unreviewed") || "all",
						);
						setPage(1);
					}}
					options={[
						{ label: "All", value: "all" },
						{ label: "Reviewed", value: "reviewed" },
						{ label: "Unreviewed", value: "unreviewed" },
					]}
				/>

				<div style={{ display: "flex", gap: 8 }}>
					<div style={{ flex: 1 }}>
						<label style={labelStyle}>Sort By</label>
						<select
							value={sortBy}
							onChange={(e) =>
								setSortBy(
									e.target.value as
										| "created_at"
										| "updated_at"
										| "quality_score"
										| "humor_score",
								)
							}
							style={selectStyle}
						>
							<option value="created_at">Created</option>
							<option value="updated_at">Updated</option>
							<option value="quality_score">Quality</option>
							<option value="humor_score">Humor</option>
						</select>
					</div>
					<div style={{ flex: 1 }}>
						<label style={labelStyle}>Order</label>
						<select
							value={sortOrder}
							onChange={(e) =>
								setSortOrder(e.target.value as "asc" | "desc")
							}
							style={selectStyle}
						>
							<option value="desc">Desc</option>
							<option value="asc">Asc</option>
						</select>
					</div>
				</div>

				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						cursor: "pointer",
						color: "#94a3b8",
						fontSize: 13,
					}}
				>
					<input
						type="checkbox"
						checked={includeDeleted}
						onChange={(e) => setIncludeDeleted(e.target.checked)}
					/>
					Include Deleted
				</label>
			</div>

			{/* Main */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						padding: "14px 24px",
						borderBottom: "1px solid #1e293b",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexShrink: 0,
					}}
				>
					<h1
						style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f8fafc" }}
					>
						Content Review
					</h1>
					{data && (
						<span style={{ color: "#64748b", fontSize: 13 }}>
							{data.total} items · page {page} of {totalPages || 1}
						</span>
					)}
				</div>

				<div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
					{isLoading ? (
						<p style={{ color: "#64748b", padding: "24px 0" }}>Loading...</p>
					) : !data?.items.length ? (
						<p
							style={{
								color: "#64748b",
								fontStyle: "italic",
								padding: "24px 0",
							}}
						>
							No content found.
						</p>
					) : (
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								color: "#cbd5e1",
								fontSize: 13,
							}}
						>
							<thead>
								<tr style={{ borderBottom: "1px solid #1e293b" }}>
									{[
										"ID",
										"Brand",
										"Type",
										"Status",
										"Content",
										"Audio",
										"Quality",
										"Humor",
										"Actions",
									].map((h) => (
										<th
											key={h}
											style={{
												padding: "12px 14px",
												textAlign: "left",
												fontSize: 10,
												fontWeight: 600,
												color: "#475569",
												textTransform: "uppercase",
												letterSpacing: 0.5,
												whiteSpace: "nowrap",
											}}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.items.map((item) => (
									<tr
										key={item.id}
										style={{
											borderBottom: "1px solid #0f172a",
											background: item.deletedAt
												? "rgba(185,28,28,0.08)"
												: "transparent",
										}}
									>
										<td style={{ padding: "10px 14px" }}>
											<code
												style={{
													fontFamily: "monospace",
													color: "#475569",
													fontSize: 11,
												}}
											>
												{item.id.slice(0, 8)}
											</code>
										</td>
										<td style={{ padding: "10px 14px" }}>
											<Badge
												color={
													item.brandId === "amen" ? "#1e3a8a" : "#3730a3"
												}
												text={item.brandId}
											/>
										</td>
										<td style={{ padding: "10px 14px" }}>
											<Badge color="#1e293b" text={item.contentType} textColor="#94a3b8" />
										</td>
										<td style={{ padding: "10px 14px" }}>
											<Badge
												color={
													item.status === "active"
														? "#064e3b"
														: item.status === "draft"
															? "#78350f"
															: "#3f3f46"
												}
												textColor={
													item.status === "active"
														? "#a7f3d0"
														: item.status === "draft"
															? "#fde68a"
															: "#d4d4d8"
												}
												text={item.status}
											/>
										</td>
										<td
											style={{
												padding: "10px 14px",
												maxWidth: 280,
											}}
										>
											<span
												style={{
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
													color: "#e2e8f0",
												}}
											>
												{getBodyPreview(item.body)}
											</span>
										</td>
										<td style={{ padding: "10px 14px" }}>
											{item.assets?.[0] ? (
												<button
													onClick={() => playAudio(item.assets[0].r2_key)}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														fontSize: 15,
														color: "#94a3b8",
													}}
													title="Play audio"
												>
													▶
												</button>
											) : (
												<span style={{ color: "#334155" }}>—</span>
											)}
										</td>
										<td style={{ padding: "10px 14px" }}>
											<StarRating
												value={item.latestReview?.qualityScore ?? null}
												onRate={(s) =>
													handleRate(
														item.id,
														"quality",
														s,
														item.latestReview,
													)
												}
											/>
										</td>
										<td style={{ padding: "10px 14px" }}>
											<StarRating
												value={item.latestReview?.humorScore ?? null}
												onRate={(s) =>
													handleRate(item.id, "humor", s, item.latestReview)
												}
											/>
										</td>
										<td style={{ padding: "10px 14px" }}>
											<button
												onClick={() => handleDelete(item.id)}
												disabled={!!item.deletedAt}
												style={{
													background: "none",
													border: "none",
													cursor: item.deletedAt ? "default" : "pointer",
													color: "#f87171",
													opacity: item.deletedAt ? 0.35 : 1,
													fontSize: 13,
													padding: 0,
												}}
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
					<div
						style={{
							padding: "12px 24px",
							borderTop: "1px solid #1e293b",
							display: "flex",
							justifyContent: "center",
							gap: 12,
							flexShrink: 0,
						}}
					>
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							style={paginationBtnStyle(page === 1)}
						>
							Previous
						</button>
						<button
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= totalPages}
							style={paginationBtnStyle(page >= totalPages)}
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
