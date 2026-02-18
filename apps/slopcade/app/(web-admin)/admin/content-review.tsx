import { Stack } from "expo-router";
import { type CSSProperties, useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";

function WebSelect({
	value,
	onChange,
	options,
	label,
}: {
	value: string | undefined;
	onChange: (val: string) => void;
	options: { label: string; value: string }[];
	label?: string;
}) {
	if (Platform.OS !== "web") return null;

	return (
		<View style={styles.filterGroup}>
			{label && <Text style={styles.label}>{label}</Text>}
			<select
				value={value || ""}
				onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
				style={
					{
						padding: "8px 12px",
						borderRadius: 6,
						border: "1px solid #334155",
						fontSize: 14,
						backgroundColor: "#1e293b",
						color: "#cbd5e1",
						width: "100%",
						outline: "none",
					} as CSSProperties
				}
			>
				<option value="">All</option>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</View>
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
		<View style={{ flexDirection: "row", gap: 2 }}>
			{[1, 2, 3, 4, 5].map((star) => (
				<TouchableOpacity key={star} onPress={() => onRate(star)}>
					<Text
						style={
							{
								fontSize: 16,
								color: star <= (value ?? 0) ? "#fbbf24" : "#475569",
								cursor: "pointer",
							} as any
						}
					>
						★
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);
}

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
		return String(text).slice(0, 80) + (String(text).length > 80 ? "..." : "");
	} catch {
		return body.slice(0, 80) + (body.length > 80 ? "..." : "");
	}
}

export default function ContentReview() {
	const [brand, setBrand] = useState<"amen" | "slopcade" | undefined>();
	const [contentType, setContentType] = useState<string | undefined>();
	const [status, setStatus] = useState<
		"draft" | "active" | "retired" | undefined
	>(undefined);
	const [search, setSearch] = useState("");
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [hasReview, setHasReview] = useState<
		"all" | "reviewed" | "unreviewed" | undefined
	>("all");

	const [sortBy, setSortBy] = useState<string>("created_at");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const [page, setPage] = useState(1);
	const pageSize = 50;

	const utils = trpcReact.useUtils();

	const { data, isLoading, error } = trpcReact.partyContent.list.useQuery(
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
			sortBy: sortBy as
				| "created_at"
				| "updated_at"
				| "quality_score"
				| "humor_score",
			sortOrder,
		},
		{
			retry: false,
		},
	);

	const upsertReview = trpcReact.partyContent.upsertReview.useMutation({
		onSuccess: () => {
			utils.partyContent.list.invalidate();
		},
	});

	const softDelete = trpcReact.partyContent.softDelete.useMutation({
		onSuccess: () => {
			utils.partyContent.list.invalidate();
		},
	});

	if (Platform.OS !== "web") {
		return (
			<View style={styles.center}>
				<Text>Web only</Text>
			</View>
		);
	}

	const handleRate = (
		contentId: string,
		type: "quality" | "humor",
		score: number,
		currentReview: {
			qualityScore: number | null;
			humorScore: number | null;
		} | null,
	) => {
		upsertReview.mutate({
			contentId,
			qualityScore:
				type === "quality" ? score : (currentReview?.qualityScore ?? 1),
			humorScore: type === "humor" ? score : (currentReview?.humorScore ?? 1),
		});
	};

	const handleDelete = (id: string) => {
		if (confirm("Are you sure you want to delete this content?")) {
			softDelete.mutate({ id });
		}
	};

	const playAudio = (r2Key: string) => {
		const url = `/assets/${r2Key}`;
		new Audio(url).play().catch((e) => console.error("Audio play failed", e));
	};

	if (error) {
		return (
			<View style={[styles.container, styles.center]}>
				<Text style={styles.errorText}>
					{error.data?.code === "FORBIDDEN"
						? "Access Denied: You are not an admin."
						: error.data?.code === "UNAUTHORIZED"
							? "Please sign in to access this page."
							: `Error: ${error.message}`}
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Stack.Screen options={{ title: "Content Review", headerShown: false }} />

			<View style={styles.sidebar}>
				<Text style={styles.sidebarTitle}>Filters</Text>

				<ScrollView style={styles.sidebarContent}>
					<View style={styles.filterSection}>
						<Text style={styles.label}>Search</Text>
						<TextInput
							style={styles.input}
							value={search}
							onChangeText={(text) => {
								setSearch(text);
								setPage(1);
							}}
							placeholder="Search content..."
							placeholderTextColor="#64748b"
						/>
					</View>

					<WebSelect
						label="Brand"
						value={brand}
						onChange={(val) => {
							setBrand((val as "amen" | "slopcade") || undefined);
							setPage(1);
						}}
						options={[
							{ label: "Amen", value: "amen" },
							{ label: "Slopcade", value: "slopcade" },
						]}
					/>

					<WebSelect
						label="Type"
						value={contentType}
						onChange={(val) => {
							setContentType(val || undefined);
							setPage(1);
						}}
						options={[
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
						]}
					/>

					<WebSelect
						label="Status"
						value={status}
						onChange={(val) => {
							setStatus((val as "draft" | "active" | "retired") || undefined);
							setPage(1);
						}}
						options={[
							{ label: "Draft", value: "draft" },
							{ label: "Active", value: "active" },
							{ label: "Retired", value: "retired" },
						]}
					/>

					<WebSelect
						label="Review Status"
						value={hasReview}
						onChange={(val) => {
							setHasReview((val as "all" | "reviewed" | "unreviewed") || "all");
							setPage(1);
						}}
						options={[
							{ label: "All", value: "all" },
							{ label: "Reviewed", value: "reviewed" },
							{ label: "Unreviewed", value: "unreviewed" },
						]}
					/>

					<View style={styles.filterSection}>
						<Text style={styles.label}>Sort By</Text>
						<View style={{ gap: 8 }}>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								style={styles.htmlSelect as CSSProperties}
							>
								<option value="created_at">Created Date</option>
								<option value="updated_at">Updated Date</option>
								<option value="quality_score">Quality Score</option>
								<option value="humor_score">Humor Score</option>
							</select>
							<select
								value={sortOrder}
								onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
								style={styles.htmlSelect as CSSProperties}
							>
								<option value="desc">Desc</option>
								<option value="asc">Asc</option>
							</select>
						</View>
					</View>

					<View style={styles.checkboxRow}>
						<input
							type="checkbox"
							checked={includeDeleted}
							onChange={(e) => setIncludeDeleted(e.target.checked)}
							style={
								{ width: 16, height: 16, cursor: "pointer" } as CSSProperties
							}
						/>
						<Text style={styles.checkboxLabel}>Include Deleted</Text>
					</View>
				</ScrollView>
			</View>

			<View style={styles.main}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Content Review</Text>
					{data && (
						<Text style={styles.headerStats}>
							{data.total} items found • Page {page} of{" "}
							{Math.ceil((data.total || 0) / pageSize)}
						</Text>
					)}
				</View>

				{isLoading ? (
					<View style={styles.center}>
						<Text style={styles.loadingText}>Loading content...</Text>
					</View>
				) : !data?.items.length ? (
					<View style={styles.center}>
						<Text style={styles.emptyText}>No content found.</Text>
					</View>
				) : (
					<ScrollView style={styles.tableContainer}>
						<table
							style={
								{
									width: "100%",
									borderCollapse: "collapse",
									color: "#cbd5e1",
									fontSize: 14,
								} as CSSProperties
							}
						>
							<thead>
								<tr
									style={
										{
											borderBottom: "1px solid #334155",
											textAlign: "left",
										} as CSSProperties
									}
								>
									<th style={styles.th as any}>ID</th>
									<th style={styles.th as any}>Brand</th>
									<th style={styles.th as any}>Type</th>
									<th style={styles.th as any}>Status</th>
									<th style={styles.th as any}>Content</th>
									<th style={styles.th as any}>Audio</th>
									<th style={styles.th as any}>Quality</th>
									<th style={styles.th as any}>Humor</th>
									<th style={styles.th as any}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map((item) => (
									<tr
										key={item.id}
										style={
											{
												borderBottom: "1px solid #1e293b",
												backgroundColor: item.deletedAt
													? "rgba(185, 28, 28, 0.1)"
													: "transparent",
											} as CSSProperties
										}
									>
										<td style={styles.td as any}>
											<Text style={styles.mono} numberOfLines={1}>
												{item.id.slice(0, 8)}
											</Text>
										</td>
										<td style={styles.td as any}>
											<span
												style={
													{
														...styles.badge,
														backgroundColor:
															item.brandId === "amen" ? "#1e3a8a" : "#3730a3",
														color: "#bfdbfe",
													} as any
												}
											>
												{item.brandId}
											</span>
										</td>
										<td style={styles.td as any}>
											<span
												style={
													{
														...styles.badge,
														backgroundColor: "#334155",
														color: "#e2e8f0",
													} as any
												}
											>
												{item.contentType}
											</span>
										</td>
										<td style={styles.td as any}>
											<span
												style={
													{
														...styles.badge,
														backgroundColor:
															item.status === "active"
																? "#064e3b"
																: item.status === "draft"
																	? "#78350f"
																	: "#3f3f46",
														color:
															item.status === "active"
																? "#a7f3d0"
																: item.status === "draft"
																	? "#fde68a"
																	: "#d4d4d8",
													} as any
												}
											>
												{item.status}
											</span>
										</td>
										<td style={{ ...(styles.td as any), maxWidth: 300 }}>
											<Text style={{ color: "#e2e8f0" }} numberOfLines={2}>
												{getBodyPreview(item.body)}
											</Text>
										</td>
										<td style={styles.td as any}>
											{item.assets?.[0] ? (
												<button
													type="button"
													onClick={() => playAudio(item.assets[0].r2_key)}
													style={styles.iconButton as any}
													title="Play Audio"
												>
													▶
												</button>
											) : (
												<span style={{ color: "#475569" }}>-</span>
											)}
										</td>
										<td style={styles.td as any}>
											<StarRating
												value={item.latestReview?.qualityScore ?? null}
												onRate={(score) =>
													handleRate(
														item.id,
														"quality",
														score,
														item.latestReview,
													)
												}
											/>
										</td>
										<td style={styles.td as any}>
											<StarRating
												value={item.latestReview?.humorScore ?? null}
												onRate={(score) =>
													handleRate(item.id, "humor", score, item.latestReview)
												}
											/>
										</td>
										<td style={styles.td as any}>
											<button
												type="button"
												onClick={() => handleDelete(item.id)}
												disabled={!!item.deletedAt}
												style={
													{
														...styles.textButton,
														color: item.deletedAt ? "#ef4444" : "#f87171",
														opacity: item.deletedAt ? 0.5 : 1,
														cursor: item.deletedAt ? "default" : "pointer",
													} as any
												}
											>
												{item.deletedAt ? "Deleted" : "Delete"}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</ScrollView>
				)}

				{data && (
					<View style={styles.pagination}>
						<TouchableOpacity
							onPress={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							style={[styles.pageButton, page === 1 && styles.disabledButton]}
						>
							<Text style={styles.pageButtonText}>Previous</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setPage((p) => p + 1)}
							disabled={page >= Math.ceil((data.total || 0) / pageSize)}
							style={[
								styles.pageButton,
								page >= Math.ceil((data.total || 0) / pageSize) &&
									styles.disabledButton,
							]}
						>
							<Text style={styles.pageButtonText}>Next</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: "#0f172a",
		height: Platform.OS === "web" ? ("100vh" as any) : "100%",
		overflow: "hidden",
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	sidebar: {
		width: 280,
		backgroundColor: "#1e293b",
		borderRightWidth: 1,
		borderRightColor: "#334155",
		padding: 20,
		display: "flex",
		flexDirection: "column",
	},
	sidebarTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#f8fafc",
		marginBottom: 20,
	},
	sidebarContent: {
		flex: 1,
	},
	main: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		backgroundColor: "#0f172a",
	},
	header: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#0f172a",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#f8fafc",
	},
	headerStats: {
		color: "#94a3b8",
		fontSize: 14,
	},
	filterSection: {
		marginBottom: 16,
	},
	filterGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		color: "#94a3b8",
		marginBottom: 6,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	input: {
		borderWidth: 1,
		borderColor: "#334155",
		borderRadius: 6,
		padding: 10,
		fontSize: 14,
		backgroundColor: "#0f172a",
		color: "#f8fafc",
	},
	checkboxRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 8,
		marginBottom: 16,
	},
	checkboxLabel: {
		color: "#cbd5e1",
		fontSize: 14,
	},
	tableContainer: {
		flex: 1,
		padding: 20,
	},
	th: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		fontSize: 12,
		fontWeight: "600",
		color: "#94a3b8",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	td: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		verticalAlign: "middle" as any,
	},
	mono: {
		fontFamily: "monospace",
		color: "#64748b",
		fontSize: 12,
	},
	badge: {
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 4,
		fontSize: 11,
		fontWeight: "600",
		display: "flex" as any,
	},
	iconButton: {
		backgroundColor: "transparent",
		borderWidth: 0,
		cursor: "pointer" as any,
		fontSize: 16,
		color: "#cbd5e1",
		padding: 4,
	},
	textButton: {
		backgroundColor: "transparent",
		borderWidth: 0,
		fontSize: 13,
		fontWeight: "500",
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 4,
	},
	pagination: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: "#1e293b",
		gap: 16,
		backgroundColor: "#0f172a",
	},
	pageButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "#1e293b",
		borderWidth: 1,
		borderColor: "#334155",
		borderRadius: 6,
	},
	disabledButton: {
		opacity: 0.5,
		backgroundColor: "#0f172a",
	},
	pageButtonText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#cbd5e1",
	},
	loadingText: {
		color: "#94a3b8",
		fontSize: 16,
	},
	errorText: {
		color: "#ef4444",
		fontSize: 16,
		textAlign: "center",
	},
	emptyText: {
		color: "#64748b",
		fontStyle: "italic",
	},
	htmlSelect: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#334155",
		fontSize: 14,
		backgroundColor: "#1e293b",
		color: "#cbd5e1",
		width: "100%",
		outline: "none",
	} as any,
});
