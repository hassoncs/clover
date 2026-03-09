import type { PenDocument } from "@slopcade/shared/types/pen";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export interface AgentCursor {
	agentId: string;
	x: number;
	y: number;
	action: string;
	timestamp: number;
}

interface MultiplayerOverlayProps {
	cursors: AgentCursor[];
	document: PenDocument;
	camera: { translateX: number; translateY: number; scale: number };
}

const AGENT_EMOJIS: Record<string, string> = {
	radbot: "🤖",
	kim: "🪄",
	default: "👤",
};

const AGENT_COLORS: Record<string, string> = {
	radbot: "#818cf8",
	kim: "#f472b6",
	default: "#a78bfa",
};

function getAgentEmoji(agentId: string): string {
	return AGENT_EMOJIS[agentId] || AGENT_EMOJIS.default;
}

function getAgentColor(agentId: string): string {
	return AGENT_COLORS[agentId] || AGENT_COLORS.default;
}

function AnimatedCursor({
	cursor,
	camera,
}: {
	cursor: AgentCursor;
	camera: MultiplayerOverlayProps["camera"];
}) {
	const screenX = cursor.x * camera.scale + camera.translateX;
	const screenY = cursor.y * camera.scale + camera.translateY;

	const animatedX = useRef(new Animated.Value(screenX)).current;
	const animatedY = useRef(new Animated.Value(screenY)).current;
	const opacity = useRef(new Animated.Value(1)).current;

	const rippleScale = useRef(new Animated.Value(1)).current;
	const rippleOpacity = useRef(new Animated.Value(0)).current;
	const bubbleScale = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.spring(animatedX, {
				toValue: screenX,
				useNativeDriver: true,
				friction: 5,
				tension: 80,
			}),
			Animated.spring(animatedY, {
				toValue: screenY,
				useNativeDriver: true,
				friction: 5,
				tension: 80,
			}),
		]).start();

		rippleScale.setValue(1);
		rippleOpacity.setValue(0.8);
		Animated.parallel([
			Animated.timing(rippleScale, {
				toValue: 2.5,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.timing(rippleOpacity, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start();

		Animated.sequence([
			Animated.timing(bubbleScale, {
				toValue: 1.15,
				duration: 120,
				useNativeDriver: true,
			}),
			Animated.timing(bubbleScale, {
				toValue: 1,
				duration: 120,
				useNativeDriver: true,
			}),
		]).start();
	}, [
		screenX,
		screenY,
		animatedX,
		animatedY,
		rippleScale,
		rippleOpacity,
		bubbleScale,
	]);

	const agentColor = getAgentColor(cursor.agentId);

	return (
		<Animated.View
			style={[
				styles.cursorContainer,
				{
					transform: [{ translateX: animatedX }, { translateY: animatedY }],
					opacity,
				},
			]}
		>
			<Animated.View
				style={[
					styles.cursorBubble,
					{
						backgroundColor: agentColor,
						transform: [{ scale: bubbleScale }],
					},
				]}
			>
				<Text style={styles.cursorEmoji}>{getAgentEmoji(cursor.agentId)}</Text>
				<Text style={styles.cursorLabel}>{cursor.agentId}</Text>
			</Animated.View>
			<View style={[styles.cursorPointer, { borderTopColor: agentColor }]} />
			<Animated.View
				style={{
					position: "absolute",
					top: 20,
					left: 4,
					width: 16,
					height: 16,
					borderRadius: 8,
					borderWidth: 2,
					borderColor: agentColor,
					transform: [{ scale: rippleScale }],
					opacity: rippleOpacity,
				}}
			/>
			{cursor.action && (
				<View style={[styles.actionBubble, { backgroundColor: agentColor }]}>
					<Text style={styles.actionText} numberOfLines={1}>
						{cursor.action}
					</Text>
				</View>
			)}
		</Animated.View>
	);
}

export function MultiplayerOverlay({
	cursors,
	document,
	camera,
}: MultiplayerOverlayProps) {
	if (!cursors || cursors.length === 0) {
		return null;
	}

	return (
		<View style={styles.overlay} pointerEvents="none">
			{cursors.map((cursor) => (
				<AnimatedCursor key={cursor.agentId} cursor={cursor} camera={camera} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 1000,
	},
	cursorContainer: {
		position: "absolute",
		alignItems: "flex-start",
	},
	cursorBubble: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	cursorEmoji: {
		fontSize: 12,
	},
	cursorLabel: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "600",
	},
	cursorPointer: {
		width: 0,
		height: 0,
		borderLeftWidth: 6,
		borderRightWidth: 6,
		borderTopWidth: 8,
		borderLeftColor: "transparent",
		borderRightColor: "transparent",
		marginLeft: 8,
	},
	actionBubble: {
		position: "absolute",
		top: 20,
		left: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		maxWidth: 150,
	},
	actionText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "500",
	},
});
