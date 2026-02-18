import { Stack } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { trpcReact } from "@/lib/trpc/react";

export default function AdminDashboard() {
	const { user } = useAuth();
	const {
		data: stats,
		isLoading,
		error,
	} = trpcReact.adminDashboard.getStats.useQuery(undefined, {
		retry: false,
	});

	if (Platform.OS !== "web") {
		return (
			<View style={styles.center}>
				<Text>Admin dashboard is web-only.</Text>
			</View>
		);
	}

	if (!user) {
		return (
			<View style={styles.center}>
				<Text>Please sign in to access admin dashboard.</Text>
			</View>
		);
	}

	if (isLoading) {
		return (
			<View style={styles.center}>
				<Text>Loading stats...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.center}>
				<Text style={styles.error}>
					{error.data?.code === "FORBIDDEN"
						? "Access Denied: You are not an admin."
						: `Error: ${error.message}`}
				</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Stack.Screen options={{ title: "Admin Dashboard" }} />

			<Text style={styles.header}>Admin Dashboard</Text>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Users</Text>
				<View style={styles.row}>
					<Card label="Total Users" value={stats?.totalUsers ?? 0} />
					<Card label="New Today" value={stats?.newUsersToday ?? 0} />
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Economy (Sparks)</Text>
				<View style={styles.row}>
					<Card
						label="Spend (24h)"
						value={(stats?.spend24h ?? 0).toLocaleString()}
					/>
					<Card
						label="Spend (7d)"
						value={(stats?.spend7d ?? 0).toLocaleString()}
					/>
				</View>
				{stats?.dailySpend && stats.dailySpend.length > 0 && (
					<View style={styles.chartSection}>
						<Text style={styles.subTitle}>Daily Spend (Last 7 Days)</Text>
						<BarChart data={stats.dailySpend} />
					</View>
				)}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Operations (24h)</Text>
				<View style={styles.row}>
					<Card label="User Gens" value={stats?.userGenerationCount24h ?? 0} />
					<Card
						label="Admin Gens"
						value={stats?.adminGenerationCount24h ?? 0}
					/>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Moderation Rejects (24h)</Text>
				{Object.keys(stats?.moderationRejects24h ?? {}).length === 0 ? (
					<Text style={styles.emptyText}>No rejections in last 24h</Text>
				) : (
					<View style={styles.grid}>
						{Object.entries(stats?.moderationRejects24h ?? {}).map(
							([category, count]) => (
								<Card key={category} label={category} value={count} />
							),
						)}
					</View>
				)}
			</View>
		</ScrollView>
	);
}

function Card({ label, value }: { label: string; value: string | number }) {
	return (
		<View style={styles.card}>
			<Text style={styles.cardValue}>{value}</Text>
			<Text style={styles.cardLabel}>{label}</Text>
		</View>
	);
}

function BarChart({ data }: { data: { day: string; amount: number }[] }) {
	const max = Math.max(...data.map((d) => d.amount), 1); // Avoid division by zero
	return (
		<View style={styles.chartContainer}>
			{data.map((d) => (
				<View key={d.day} style={styles.barWrapper}>
					<View style={styles.barContainer}>
						<View
							style={[styles.bar, { height: `${(d.amount / max) * 100}%` }]}
						/>
					</View>
					<Text style={styles.barLabel}>{d.day.slice(5)}</Text>
					<Text style={styles.barValue}>
						{(d.amount / 1000000).toFixed(1)}M
					</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	content: {
		padding: 20,
		maxWidth: 800,
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
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 24,
		color: "#333",
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "600",
		marginBottom: 16,
		color: "#555",
	},
	subTitle: {
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 12,
		marginTop: 16,
		color: "#666",
	},
	row: {
		flexDirection: "row",
		gap: 16,
		flexWrap: "wrap",
	},
	grid: {
		flexDirection: "row",
		gap: 16,
		flexWrap: "wrap",
	},
	card: {
		backgroundColor: "white",
		padding: 20,
		borderRadius: 12,
		minWidth: 150,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	cardValue: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#000",
		marginBottom: 4,
	},
	cardLabel: {
		fontSize: 14,
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	chartSection: {
		marginTop: 16,
		backgroundColor: "white",
		padding: 20,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	chartContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		height: 200,
		paddingTop: 20,
	},
	barWrapper: {
		alignItems: "center",
		flex: 1,
	},
	barContainer: {
		height: 150,
		width: "100%",
		justifyContent: "flex-end",
		alignItems: "center",
	},
	bar: {
		width: 20,
		backgroundColor: "#4CAF50",
		borderRadius: 4,
		minHeight: 4,
	},
	barLabel: {
		fontSize: 10,
		color: "#888",
		marginTop: 8,
	},
	barValue: {
		fontSize: 10,
		color: "#333",
		fontWeight: "bold",
	},
	error: {
		color: "red",
		fontSize: 16,
	},
	emptyText: {
		color: "#888",
		fontStyle: "italic",
	},
});
