import {
	BrowserRouter,
	Navigate,
	NavLink,
	Route,
	Routes,
} from "react-router-dom";
import {
	AuthProvider,
	isDevBypassActive,
	setDevBypass,
	useAuth,
} from "./lib/auth";
import { supabase } from "./lib/supabase";
import { TRPCProvider } from "./lib/trpc";
import { ContentReviewPage } from "./pages/ContentReviewPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

function NavBar() {
	const { user } = useAuth();

	const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
		color: isActive ? "#f8fafc" : "#64748b",
		textDecoration: "none",
		fontSize: 14,
		fontWeight: isActive ? 600 : 400,
	});

	return (
		<nav
			style={{
				display: "flex",
				alignItems: "center",
				padding: "0 24px",
				height: 48,
				background: "#1e293b",
				borderBottom: "1px solid #334155",
				gap: 24,
				flexShrink: 0,
			}}
		>
			<span
				style={{
					fontWeight: 700,
					color: "#f8fafc",
					fontSize: 15,
					marginRight: 8,
				}}
			>
				Admin
			</span>
			<NavLink to="/dashboard" style={navLinkStyle}>
				Dashboard
			</NavLink>
			<NavLink to="/content-review" style={navLinkStyle}>
				Content Review
			</NavLink>
			<div
				style={{
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<span style={{ color: "#475569", fontSize: 13 }}>{user?.email}</span>
				<button
					type="button"
					onClick={() => {
						if (isDevBypassActive()) {
							setDevBypass(false);
							window.location.href = "/login";
						} else {
							supabase.auth.signOut();
						}
					}}
					style={{
						padding: "4px 12px",
						background: "transparent",
						border: "1px solid #334155",
						borderRadius: 6,
						color: "#64748b",
						cursor: "pointer",
						fontSize: 13,
					}}
				>
					Sign Out
				</button>
			</div>
		</nav>
	);
}

function AuthGuard({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div
				style={{
					display: "flex",
					height: "100vh",
					alignItems: "center",
					justifyContent: "center",
					color: "#64748b",
				}}
			>
				Loading...
			</div>
		);
	}

	if (!user) return <Navigate to="/login" replace />;

	return <>{children}</>;
}

function AppLayout() {
	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<NavBar />
			<div style={{ flex: 1, overflow: "hidden" }}>
				<Routes>
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/content-review" element={<ContentReviewPage />} />
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<TRPCProvider>
				<BrowserRouter>
					<Routes>
						<Route path="/login" element={<LoginPage />} />
						<Route
							path="/*"
							element={
								<AuthGuard>
									<AppLayout />
								</AuthGuard>
							}
						/>
					</Routes>
				</BrowserRouter>
			</TRPCProvider>
		</AuthProvider>
	);
}
