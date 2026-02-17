import type React from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

interface AmenSplashSequenceProps {
	onComplete?: () => void;
	duration?: number;
}

export const AmenSplashSequence: React.FC<AmenSplashSequenceProps> = ({
	onComplete,
	duration = 3000,
}) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			if (onComplete) onComplete();
		}, duration);

		return () => clearTimeout(timer);
	}, [duration, onComplete]);

	const cssStyles = `
    @keyframes amen-splash-draw {
      from { stroke-dashoffset: 140; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes amen-splash-glow {
      from { filter: drop-shadow(0 0 0px rgba(255, 215, 0, 0)); }
      to { filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)); }
    }
    @keyframes amen-splash-fade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

	return (
		<View style={styles.container}>
			<style dangerouslySetInnerHTML={{ __html: cssStyles }} />
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
				}}
			>
				<svg
					width="120"
					height="120"
					viewBox="0 0 100 100"
					style={{
						overflow: "visible",
						animation: "amen-splash-glow 1000ms ease-out 1000ms forwards",
					}}
				>
					<title>Amen Cross</title>
					<path
						d="M 50 15 L 50 85 M 20 42 L 80 42"
						fill="none"
						stroke="#C9A84C"
						strokeWidth="6"
						strokeLinecap="round"
						style={{
							strokeDasharray: 140,
							strokeDashoffset: 140,
							animation: "amen-splash-draw 1000ms ease-out forwards",
						}}
					/>
				</svg>
				<div
					style={{
						marginTop: 24,
						fontFamily: "serif",
						fontSize: 24,
						letterSpacing: 4,
						color: "#C9A84C",
						fontWeight: "bold",
						opacity: 0,
						animation: "amen-splash-fade 1000ms ease-out 2000ms forwards",
					}}
				>
					AMEN
				</div>
			</div>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFDF7",
		alignItems: "center",
		justifyContent: "center",
	},
});
