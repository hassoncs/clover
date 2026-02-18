import { Stack } from "expo-router";
import { useState } from "react";
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
}: {
	value: string | undefined;
	onChange: (val: string) => void;
	options: { label: string; value: string }[];
}) {
	if (Platform.OS !== "web") return null;

	return (
		<select
			value={value || ""}
			onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
			style={{
				padding: 8,
				borderRadius: 6,
				border: "1px solid #d1d5db",
				fontSize: 14,
			}}
		>
			<option value="">All</option>
			{options.map((opt) => (
				<option key={opt.value} value={opt.value}>
					{opt.label}
				</option>
			))}
		</select>
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
						style={{
							fontSize: 18,
							color: star <= (value ?? 0) ? "#f59e0b" : "#d1d5db",
						}}
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
		return String(text).slice(0, 100);
	} catch {
		return body.slice(0, 100);
	}
}

export default function ContentReview() {
	const [brand, setBrand] = useState<"amen" | "slopcade" | undefined>();
	const [contentType, setContentType] = useState<string | undefined>();
	const [status, setStatus] = useState<
		"draft" | "active" | "retired" | undefined
	>("draft");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const pageSize = 50;

	const utils = trpcReact.useUtils();

	const { data, isLoading, error } = trpcReact.partyContent.list.useQuery({
		page,
		pageSize,
		brand,
		contentType,
		status,
		search,
	});

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

	const handleBrandChange = (val: string) => {
		setBrand((val as "amen" | "slopcade") || undefined);
		setPage(1);
	};
	const handleTypeChange = (val: string) => {
		setContentType(val || undefined);
		setPage(1);
	};
	const handleStatusChange = (val: string) => {
		setStatus((val as "draft" | "active" | "retired") || undefined);
		setPage(1);
	};

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

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Stack.Screen options={{ title: "Content Review" }} />

			<Text style={styles.header}>Content Review</Text>

			<View style={styles.filters}>
				<View style={styles.filterGroup}>
					<Text style={styles.label}>Brand</Text>
					<WebSelect
						value={brand}
						onChange={handleBrandChange}
						options={[
							{ label: "Amen", value: "amen" },
							{ label: "Slopcade", value: "slopcade" },
						]}
					/>
				</View>

				<View style={styles.filterGroup}>
					<Text style={styles.label}>Type</Text>
					<WebSelect
						value={contentType}
						onChange={handleTypeChange}
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
				</View>

				<View style={styles.filterGroup}>
					<Text style={styles.label}>Status</Text>
					<WebSelect
						value={status}
						onChange={handleStatusChange}
						options={[
							{ label: "Draft", value: "draft" },
							{ label: "Active", value: "active" },
							{ label: "Retired", value: "retired" },
						]}
					/>
				</View>

				<View style={[styles.filterGroup, { flex: 1 }]}>
					<Text style={styles.label}>Search</Text>
					<TextInput
						style={styles.input}
						value={search}
						onChangeText={(text) => {
							setSearch(text);
							setPage(1);
						}}
						placeholder="Search content..."
					/>
				</View>
			</View>

			{isLoading ? (
				<Text style={styles.loading}>Loading...</Text>
			) : error ? (
				<Text style={styles.error}>{error.message}</Text>
			) : !data?.items.length ? (
				<Text style={styles.empty}>No content found.</Text>
			) : (
				<View style={styles.list}>
					{data.items.map((item) => (
						<View key={item.id} style={styles.row}>
							<View style={styles.rowHeader}>
								<Text style={styles.id} numberOfLines={1}>
									{item.id}
								</Text>
								<View style={styles.badges}>
									<Text style={[styles.badge, styles.brandBadge]}>
										{item.brandId}
									</Text>
									<Text style={[styles.badge, styles.typeBadge]}>
										{item.contentType}
									</Text>
									<Text
										style={[
											styles.badge,
											item.status === "active"
												? styles.activeBadge
												: styles.draftBadge,
										]}
									>
										{item.status}
									</Text>
									{item.deletedAt && (
										<Text style={[styles.badge, styles.deletedBadge]}>
											Deleted
										</Text>
									)}
								</View>
							</View>

							<Text style={styles.body}>{getBodyPreview(item.body)}</Text>

							<View style={styles.controls}>
								<View style={styles.audioControl}>
									{item.assets?.[0] ? (
										<TouchableOpacity
											onPress={() => playAudio(item.assets[0].r2_key)}
											style={styles.playButton}
										>
											<Text style={styles.playButtonText}>▶ Play Audio</Text>
										</TouchableOpacity>
									) : (
										<Text style={styles.noAudio}>No audio</Text>
									)}
								</View>

								<View style={styles.ratings}>
									<View style={styles.ratingGroup}>
										<Text style={styles.ratingLabel}>Quality</Text>
										<StarRating
											value={item.latestReview?.qualityScore ?? null}
											onRate={(score) =>
												handleRate(item.id, "quality", score, item.latestReview)
											}
										/>
									</View>
									<View style={styles.ratingGroup}>
										<Text style={styles.ratingLabel}>Humor</Text>
										<StarRating
											value={item.latestReview?.humorScore ?? null}
											onRate={(score) =>
												handleRate(item.id, "humor", score, item.latestReview)
											}
										/>
									</View>
								</View>

								<TouchableOpacity
									onPress={() => handleDelete(item.id)}
									style={styles.deleteButton}
									disabled={!!item.deletedAt}
								>
									<Text style={styles.deleteButtonText}>
										{item.deletedAt ? "Deleted" : "Delete"}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					))}
				</View>
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
					<Text style={styles.pageInfo}>
						Page {page} of {Math.ceil((data.total || 0) / pageSize)}
					</Text>
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
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9fafb",
	},
	content: {
		padding: 20,
		maxWidth: 1000,
		alignSelf: "center",
		width: "100%",
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	header: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		color: "#111827",
	},
	filters: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 16,
		marginBottom: 24,
		backgroundColor: "white",
		padding: 16,
		borderRadius: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	filterGroup: {
		minWidth: 150,
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 4,
	},
	input: {
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 6,
		padding: 8,
		fontSize: 14,
		backgroundColor: "white",
	},
	loading: {
		textAlign: "center",
		marginTop: 40,
		color: "#6b7280",
	},
	error: {
		textAlign: "center",
		marginTop: 40,
		color: "#ef4444",
	},
	empty: {
		textAlign: "center",
		marginTop: 40,
		color: "#6b7280",
		fontStyle: "italic",
	},
	list: {
		gap: 12,
	},
	row: {
		backgroundColor: "white",
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	rowHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
		flexWrap: "wrap",
		gap: 8,
	},
	id: {
		fontSize: 12,
		color: "#9ca3af",
		fontFamily: "monospace",
	},
	badges: {
		flexDirection: "row",
		gap: 6,
	},
	badge: {
		fontSize: 11,
		fontWeight: "600",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: "hidden",
	},
	brandBadge: {
		backgroundColor: "#eff6ff",
		color: "#1d4ed8",
	},
	typeBadge: {
		backgroundColor: "#f3f4f6",
		color: "#374151",
	},
	activeBadge: {
		backgroundColor: "#ecfdf5",
		color: "#047857",
	},
	draftBadge: {
		backgroundColor: "#fffbeb",
		color: "#b45309",
	},
	deletedBadge: {
		backgroundColor: "#fef2f2",
		color: "#b91c1c",
	},
	body: {
		fontSize: 15,
		color: "#1f2937",
		marginBottom: 12,
		lineHeight: 22,
	},
	controls: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
		borderTopColor: "#f3f4f6",
		paddingTop: 12,
		flexWrap: "wrap",
		gap: 16,
	},
	audioControl: {
		minWidth: 100,
	},
	playButton: {
		backgroundColor: "#f3f4f6",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 4,
	},
	playButtonText: {
		fontSize: 13,
		fontWeight: "500",
		color: "#374151",
	},
	noAudio: {
		fontSize: 13,
		color: "#9ca3af",
		fontStyle: "italic",
	},
	ratings: {
		flexDirection: "row",
		gap: 24,
	},
	ratingGroup: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	ratingLabel: {
		fontSize: 12,
		color: "#6b7280",
		fontWeight: "500",
	},
	deleteButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 4,
		backgroundColor: "#fee2e2",
	},
	deleteButtonText: {
		fontSize: 13,
		fontWeight: "500",
		color: "#b91c1c",
	},
	pagination: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: 24,
		gap: 16,
		marginBottom: 40,
	},
	pageButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "white",
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 6,
	},
	disabledButton: {
		opacity: 0.5,
		backgroundColor: "#f3f4f6",
	},
	pageButtonText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
	pageInfo: {
		fontSize: 14,
		color: "#6b7280",
	},
});
