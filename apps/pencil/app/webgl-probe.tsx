import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type ProbeState = {
	hasWindow: boolean;
	userAgent: string;
	hasWebGLContext: boolean;
	hasWebGL2Context: boolean;
	hasOffscreenCanvas: boolean;
	hasNavigatorGpu: boolean;
	renderer: string | null;
	vendor: string | null;
	error: string | null;
};

function readProbeState(): ProbeState {
	if (typeof window === "undefined") {
		return {
			hasWindow: false,
			userAgent: "server",
			hasWebGLContext: false,
			hasWebGL2Context: false,
			hasOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
			hasNavigatorGpu: false,
			renderer: null,
			vendor: null,
			error: null,
		};
	}

	try {
		const canvas = window.document.createElement("canvas");
		const webgl = canvas.getContext("webgl");
		const webgl2 = canvas.getContext("webgl2");
		const gl = webgl2 ?? webgl;
		const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info") ?? null;

		return {
			hasWindow: true,
			userAgent: window.navigator.userAgent,
			hasWebGLContext: webgl !== null,
			hasWebGL2Context: webgl2 !== null,
			hasOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
			hasNavigatorGpu: typeof navigator !== "undefined" && "gpu" in navigator,
			renderer:
				gl && debugInfo
					? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
					: null,
			vendor:
				gl && debugInfo
					? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
					: null,
			error: null,
		};
	} catch (error) {
		return {
			hasWindow: true,
			userAgent: window.navigator.userAgent,
			hasWebGLContext: false,
			hasWebGL2Context: false,
			hasOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
			hasNavigatorGpu: typeof navigator !== "undefined" && "gpu" in navigator,
			renderer: null,
			vendor: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function ProbeRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{value}</Text>
		</View>
	);
}

export default function WebglProbeRoute() {
	const [probe, setProbe] = useState<ProbeState>(() => readProbeState());

	useEffect(() => {
		setProbe(readProbeState());
	}, []);

	const rows = useMemo(
		() => [
			["hasWindow", String(probe.hasWindow)],
			["hasWebGLContext", String(probe.hasWebGLContext)],
			["hasWebGL2Context", String(probe.hasWebGL2Context)],
			["hasOffscreenCanvas", String(probe.hasOffscreenCanvas)],
			["hasNavigatorGpu", String(probe.hasNavigatorGpu)],
			["renderer", probe.renderer ?? "unavailable"],
			["vendor", probe.vendor ?? "unavailable"],
			["error", probe.error ?? "none"],
		],
		[probe],
	);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<View style={styles.card}>
				<Text style={styles.title}>WebGL Probe</Text>
				<Text style={styles.subtitle}>
					Non-Skia browser capability report for Pencil web.
				</Text>
			</View>
			<View style={styles.card}>
				{rows.map(([label, value]) => (
					<ProbeRow key={label} label={label} value={value} />
				))}
			</View>
			<View style={styles.card}>
				<Text style={styles.sectionTitle}>userAgent</Text>
				<Text style={styles.userAgent}>{probe.userAgent}</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
		gap: 16,
		backgroundColor: "#020617",
		minHeight: "100%",
	},
	card: {
		backgroundColor: "#111827",
		borderRadius: 12,
		padding: 16,
		gap: 12,
		borderWidth: 1,
		borderColor: "#1f2937",
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#f8fafc",
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: "#94a3b8",
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 0.4,
		color: "#cbd5e1",
		textTransform: "uppercase",
	},
	row: {
		gap: 4,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#1f2937",
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		color: "#93c5fd",
	},
	value: {
		fontSize: 14,
		lineHeight: 20,
		color: "#e2e8f0",
	},
	userAgent: {
		fontSize: 13,
		lineHeight: 20,
		color: "#cbd5e1",
	},
});
