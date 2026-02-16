import {
	DndProvider,
	Draggable,
	Droppable,
	type ItemOptions,
	useActiveDropReaction,
} from "@mgcrea/react-native-dnd";
import { useState } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";
import { runOnJS } from "react-native-reanimated";

interface MatchingInputProps {
	players: Array<{ id: string; name: string }>;
	roles: Array<{ id: string; label: string }>;
	onSubmit: (assignments: Record<string, string>) => void; // roleId -> playerId
	timeLimit?: number;
	disabled?: boolean;
}

function PlayerCard({
	player,
	isDragging,
}: {
	player: { id: string; name: string };
	isDragging?: boolean;
}) {
	return (
		<View
			className={`bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm ${
				isDragging ? "opacity-50 scale-105 border-indigo-500" : ""
			}`}
		>
			<Text className="text-base font-medium text-gray-800">{player.name}</Text>
		</View>
	);
}

function DroppableRole({
	id,
	label,
	assignedPlayer,
	children,
}: {
	id: string;
	label: string;
	assignedPlayer?: { id: string; name: string };
	children?: React.ReactNode;
}) {
	const [isActive, setIsActive] = useState(false);

	useActiveDropReaction(id, (active) => {
		runOnJS(setIsActive)(active);
	});

	return (
		<Droppable
			id={id}
			className={`p-4 rounded-xl border-2 mb-3 min-h-[80px] justify-center ${
				isActive
					? "border-indigo-500 bg-indigo-50"
					: assignedPlayer
						? "border-gray-300 bg-white"
						: "border-dashed border-gray-300 bg-gray-50"
			}`}
		>
			<View className="flex-row items-center justify-between">
				<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
					{label}
				</Text>
				{children}
			</View>
		</Droppable>
	);
}

export function MatchingInput({
	players,
	roles,
	onSubmit,
	timeLimit,
	disabled,
}: MatchingInputProps) {
	// roleId -> playerId
	const [assignments, setAssignments] = useState<Record<string, string>>({});

	const handleDragEnd = (event: {
		active: ItemOptions;
		over: ItemOptions | null;
	}) => {
		"worklet";
		const { active, over } = event;

		if (!over) return;

		const activeId = String(active.id);
		const overId = String(over.id);

		const updateState = () => {
			if (overId === "unassigned-zone") {
				setAssignments((prev) => {
					const next = { ...prev };
					const roleId = Object.keys(next).find((r) => next[r] === activeId);
					if (roleId) {
						delete next[roleId];
					}
					return next;
				});
				return;
			}

			const isRole = roles.some((r) => r.id === overId);
			if (isRole) {
				setAssignments((prev) => {
					const next = { ...prev };

					const prevRole = Object.keys(next).find((r) => next[r] === activeId);
					if (prevRole) {
						delete next[prevRole];
					}

					next[overId] = activeId;

					return next;
				});
			}
		};

		runOnJS(updateState)();
	};

	const handleSubmit = () => {
		onSubmit(assignments);
	};

	const assignedPlayerIds = Object.values(assignments);
	const unassignedPlayers = players.filter(
		(p) => !assignedPlayerIds.includes(p.id),
	);
	const allRolesFilled = roles.every((r) => assignments[r.id]);

	return (
		<DndProvider onDragEnd={handleDragEnd}>
			<View className="flex-1 bg-gray-50 p-4 gap-6">
				<View>
					<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
						Players
					</Text>
					<Droppable
						id="unassigned-zone"
						className="flex-row flex-wrap gap-2 min-h-[60px] p-2 rounded-xl bg-gray-100 border-2 border-transparent"
					>
						{unassignedPlayers.length === 0 ? (
							<Text className="text-gray-400 italic w-full text-center py-2">
								All players assigned
							</Text>
						) : (
							unassignedPlayers.map((player) => (
								<Draggable key={player.id} id={player.id}>
									<PlayerCard player={player} />
								</Draggable>
							))
						)}
					</Droppable>
				</View>

				<View className="flex-1">
					<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
						Roles
					</Text>
					<View className="gap-2">
						{roles.map((role) => {
							const assignedPlayerId = assignments[role.id];
							const assignedPlayer = players.find(
								(p) => p.id === assignedPlayerId,
							);

							return (
								<DroppableRole
									key={role.id}
									id={role.id}
									label={role.label}
									assignedPlayer={assignedPlayer}
								>
									{assignedPlayer ? (
										<Draggable id={assignedPlayer.id}>
											<PlayerCard player={assignedPlayer} />
										</Draggable>
									) : (
										<Text className="text-gray-400 italic">Drop here</Text>
									)}
								</DroppableRole>
							);
						})}
					</View>
				</View>

				<TouchableOpacity
					onPress={handleSubmit}
					disabled={!allRolesFilled || disabled}
					className={`py-4 rounded-xl items-center mt-auto ${
						allRolesFilled && !disabled ? "bg-gray-900" : "bg-gray-300"
					}`}
				>
					<Text className="text-white text-lg font-bold">
						Submit Assignments
					</Text>
				</TouchableOpacity>
			</View>
		</DndProvider>
	);
}
