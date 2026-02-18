import type React from "react";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface WithGodotProps {
	loadModule: () => Promise<Record<string, unknown>>;
	render: (mod: Record<string, unknown>) => React.ReactNode;
	fallback?: React.ReactNode;
}

let cachedModule: Record<string, unknown> | null = null;

export function WithGodot({
	loadModule,
	render,
	fallback = <View style={styles.fallback} />,
}: WithGodotProps) {
	const [mod, setMod] = useState<Record<string, unknown> | null>(cachedModule);

	useEffect(() => {
		if (mod) return;

		let cancelled = false;
		loadModule()
			.then((m) => {
				cachedModule = m;
				if (!cancelled) setMod(m);
			})
			.catch((err) => {
				console.error("[WithGodot] Failed to load module:", err);
			});

		return () => {
			cancelled = true;
		};
	}, [loadModule, mod]);

	if (!mod) {
		return <>{fallback}</>;
	}

	return <>{render(mod)}</>;
}

const styles = StyleSheet.create({
	fallback: {
		flex: 1,
		backgroundColor: "#1a1a2e",
	},
});
