import { trpc } from "../lib/trpc";

export function DashboardPage() {
	const {
		data: stats,
		isLoading,
		error,
	} = trpc.adminDashboard.getStats.useQuery(undefined, { retry: false });

	if (isLoading) {
		return (
			<Center>
				<p style={{ color: "#94a3b8" }}>Loading stats...</p>
			</Center>
		);
	}

	if (error) {
		return (
			<Center>
				<p style={{ color: "#ef4444" }}>
					{error.data?.code === "FORBIDDEN"
						? "Access Denied: You are not an admin."
						: `Error: ${error.message}`}
				</p>
			</Center>
		);
	}

	return (
		<div
			style={{
				overflowY: "auto",
				height: "100%",
				padding: 32,
				maxWidth: 900,
				margin: "0 auto",
			}}
		>
			<h1
				style={{
					fontSize: 30,
					fontWeight: 700,
					marginBottom: 36,
					color: "#f8fafc",
				}}
			>
				Dashboard
			</h1>

			<Section title="Users">
				<CardRow>
					<StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
					<StatCard label="New Today" value={stats?.newUsersToday ?? 0} />
				</CardRow>
			</Section>

			<Section title="Economy (Sparks)">
				<CardRow>
					<StatCard
						label="Spend (24h)"
						value={(stats?.spend24h ?? 0).toLocaleString()}
					/>
					<StatCard
						label="Spend (7d)"
						value={(stats?.spend7d ?? 0).toLocaleString()}
					/>
				</CardRow>
				{stats?.dailySpend && stats.dailySpend.length > 0 && (
					<div
						style={{
							marginTop: 20,
							background: "#1e293b",
							borderRadius: 12,
							padding: 24,
							border: "1px solid #334155",
						}}
					>
						<p
							style={{
								margin: "0 0 16px",
								fontSize: 13,
								color: "#64748b",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: 0.5,
							}}
						>
							Daily Spend — Last 7 Days
						</p>
						<BarChart data={stats.dailySpend} />
					</div>
				)}
			</Section>

			<Section title="Operations (24h)">
				<CardRow>
					<StatCard
						label="User Gens"
						value={stats?.userGenerationCount24h ?? 0}
					/>
					<StatCard
						label="Admin Gens"
						value={stats?.adminGenerationCount24h ?? 0}
					/>
				</CardRow>
			</Section>

			<Section title="Moderation Rejects (24h)">
				{Object.keys(stats?.moderationRejects24h ?? {}).length === 0 ? (
					<p style={{ color: "#64748b", fontStyle: "italic", margin: 0 }}>
						No rejections in last 24h
					</p>
				) : (
					<CardRow>
						{Object.entries(stats?.moderationRejects24h ?? {}).map(
							([cat, count]) => (
								<StatCard key={cat} label={cat} value={count} />
							),
						)}
					</CardRow>
				)}
			</Section>
		</div>
	);
}

function Center({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				alignItems: "center",
				justifyContent: "center",
				padding: 20,
			}}
		>
			{children}
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section style={{ marginBottom: 40 }}>
			<h2
				style={{
					fontSize: 16,
					fontWeight: 600,
					color: "#94a3b8",
					margin: "0 0 16px",
					textTransform: "uppercase",
					letterSpacing: 0.5,
				}}
			>
				{title}
			</h2>
			{children}
		</section>
	);
}

function CardRow({ children }: { children: React.ReactNode }) {
	return (
		<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{children}</div>
	);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div
			style={{
				background: "#1e293b",
				borderRadius: 12,
				padding: 20,
				minWidth: 160,
				border: "1px solid #334155",
			}}
		>
			<p
				style={{
					margin: 0,
					fontSize: 30,
					fontWeight: 700,
					color: "#f8fafc",
				}}
			>
				{value}
			</p>
			<p
				style={{
					margin: "4px 0 0",
					fontSize: 11,
					color: "#64748b",
					textTransform: "uppercase",
					letterSpacing: 0.5,
				}}
			>
				{label}
			</p>
		</div>
	);
}

function BarChart({ data }: { data: { day: string; amount: number }[] }) {
	const max = Math.max(...data.map((d) => d.amount), 1);
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-end",
				gap: 8,
				height: 140,
			}}
		>
			{data.map((d) => (
				<div
					key={d.day}
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						height: "100%",
					}}
				>
					<div
						style={{
							flex: 1,
							display: "flex",
							alignItems: "flex-end",
							width: "100%",
						}}
					>
						<div
							style={{
								width: "100%",
								background: "#3b82f6",
								borderRadius: 4,
								height: `${(d.amount / max) * 100}%`,
								minHeight: 4,
							}}
						/>
					</div>
					<p style={{ margin: "6px 0 0", fontSize: 10, color: "#64748b" }}>
						{d.day.slice(5)}
					</p>
					<p
						style={{
							margin: "2px 0 0",
							fontSize: 10,
							color: "#94a3b8",
							fontWeight: 600,
						}}
					>
						{(d.amount / 1_000_000).toFixed(1)}M
					</p>
				</div>
			))}
		</div>
	);
}
