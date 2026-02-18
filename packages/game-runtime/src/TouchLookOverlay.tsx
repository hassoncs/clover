import { useCallback, useRef } from "react";
import {
	type GestureResponderEvent,
	Platform,
	StyleSheet,
	View,
} from "react-native";

export interface TouchLookOverlayProps {
	viewportRect: { x: number; y: number; width: number; height: number };
	onTouchLook: (deltaX: number, deltaY: number) => void;
	sensitivity?: number;
}

export function TouchLookOverlay({
	viewportRect,
	onTouchLook,
	sensitivity = 1.0,
}: TouchLookOverlayProps) {
	const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
	const activeTouchIdRef = useRef<number | null>(null);

	const handleTouchStart = useCallback((event: GestureResponderEvent) => {
		const { locationX, locationY, identifier } = event.nativeEvent;
		activeTouchIdRef.current = Number(identifier);
		lastTouchRef.current = { x: locationX, y: locationY };
	}, []);

	const handleTouchMove = useCallback(
		(event: GestureResponderEvent) => {
			const { locationX, locationY, identifier } = event.nativeEvent;
			if (Number(identifier) !== activeTouchIdRef.current) return;
			if (!lastTouchRef.current) return;

			const deltaX = (locationX - lastTouchRef.current.x) * sensitivity;
			const deltaY = (locationY - lastTouchRef.current.y) * sensitivity;

			lastTouchRef.current = { x: locationX, y: locationY };
			onTouchLook(deltaX, deltaY);
		},
		[onTouchLook, sensitivity],
	);

	const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
		const { identifier } = event.nativeEvent;
		if (Number(identifier) === activeTouchIdRef.current) {
			activeTouchIdRef.current = null;
			lastTouchRef.current = null;
		}
	}, []);

	const rightSideStyle = {
		left: viewportRect.x + viewportRect.width / 2,
		top: viewportRect.y,
		width: viewportRect.width / 2,
		height: viewportRect.height,
	};

	if (Platform.OS === "web") {
		return (
			<div
				style={{
					position: "absolute",
					...rightSideStyle,
					touchAction: "none",
					pointerEvents: "auto",
				}}
				onTouchStart={(e) => {
					const touch = e.changedTouches[0];
					const rect = e.currentTarget.getBoundingClientRect();
					const x = touch.clientX - rect.left;
					const y = touch.clientY - rect.top;
					activeTouchIdRef.current = touch.identifier;
					lastTouchRef.current = { x, y };
				}}
				onTouchMove={(e) => {
					if (!lastTouchRef.current) return;
					const touch = Array.from(e.touches).find(
						(t) => t.identifier === activeTouchIdRef.current,
					);
					if (!touch) return;
					const rect = e.currentTarget.getBoundingClientRect();
					const x = touch.clientX - rect.left;
					const y = touch.clientY - rect.top;
					const deltaX = (x - lastTouchRef.current.x) * sensitivity;
					const deltaY = (y - lastTouchRef.current.y) * sensitivity;
					lastTouchRef.current = { x, y };
					onTouchLook(deltaX, deltaY);
				}}
				onTouchEnd={() => {
					activeTouchIdRef.current = null;
					lastTouchRef.current = null;
				}}
			/>
		);
	}

	return (
		<View
			style={[styles.overlay, rightSideStyle]}
			onStartShouldSetResponder={() => true}
			onMoveShouldSetResponder={() => true}
			onResponderGrant={handleTouchStart}
			onResponderMove={handleTouchMove}
			onResponderRelease={handleTouchEnd}
			onResponderTerminate={handleTouchEnd}
		/>
	);
}

const styles = StyleSheet.create({
	overlay: {
		position: "absolute",
	},
});
