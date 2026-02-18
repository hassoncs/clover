import { useState } from "react";
import { setDevBypass } from "../lib/auth";
import { supabase } from "../lib/supabase";

export function LoginPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleDevLogin = () => {
		setDevBypass(true);
		window.location.href = "/";
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: window.location.origin },
		});
		setIsLoading(false);
		if (error) {
			setError(error.message);
		} else {
			setSent(true);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				height: "100vh",
				alignItems: "center",
				justifyContent: "center",
				background: "#0f172a",
			}}
		>
			<div
				style={{
					width: 360,
					padding: 40,
					background: "#1e293b",
					borderRadius: 12,
					border: "1px solid #334155",
				}}
			>
				<h1
					style={{
						margin: "0 0 6px",
						fontSize: 24,
						fontWeight: 700,
						color: "#f8fafc",
					}}
				>
					Admin
				</h1>
				<p style={{ margin: "0 0 28px", color: "#64748b", fontSize: 14 }}>
					Sign in with your admin email
				</p>

				{sent ? (
					<p style={{ color: "#a7f3d0", fontSize: 14 }}>
						Check your email for a magic link.
					</p>
				) : (
					<form
						onSubmit={handleSubmit}
						style={{ display: "flex", flexDirection: "column", gap: 14 }}
					>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@example.com"
							required
							style={{
								padding: "10px 14px",
								background: "#0f172a",
								border: "1px solid #334155",
								borderRadius: 8,
								color: "#f8fafc",
								fontSize: 14,
								outline: "none",
							}}
						/>
						{error && (
							<p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>
								{error}
							</p>
						)}
						<button
							type="submit"
							disabled={isLoading}
							style={{
								padding: "10px 14px",
								background: "#3b82f6",
								border: "none",
								borderRadius: 8,
								color: "#fff",
								fontSize: 14,
								fontWeight: 600,
								cursor: isLoading ? "default" : "pointer",
								opacity: isLoading ? 0.7 : 1,
							}}
						>
							{isLoading ? "Sending..." : "Send Magic Link"}
						</button>
					</form>
				)}
				{import.meta.env.DEV && (
					<>
						<div
							style={{ borderTop: "1px solid #1e3a2f", margin: "24px 0 0" }}
						/>
						<button
							type="button"
							onClick={handleDevLogin}
							style={{
								marginTop: 16,
								width: "100%",
								padding: "10px 14px",
								background: "#14532d",
								border: "1px solid #166534",
								borderRadius: 8,
								color: "#86efac",
								fontSize: 13,
								fontWeight: 600,
								cursor: "pointer",
								letterSpacing: "0.02em",
							}}
						>
							⚡ Dev Login (hassoncs@gmail.com)
						</button>
					</>
				)}
			</div>
		</div>
	);
}
