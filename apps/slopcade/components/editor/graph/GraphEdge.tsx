import {
	BaseEdge,
	type Edge,
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
} from "@xyflow/react";
import { X } from "lucide-react";
import { memo } from "react";
import { TouchableOpacity, View } from "react-native";

export type GraphEdgeData = Record<string, unknown>;
export type GraphEdge = Edge<GraphEdgeData>;

export const GraphEdgeComponent = memo(
	({
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		style = {},
		markerEnd,
		selected,
		data,
	}: EdgeProps<GraphEdge>) => {
		const [edgePath, labelX, labelY] = getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
		});

		const onDelete = data?.onDelete as (() => void) | undefined;

		return (
			<>
				<BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
				{selected && onDelete && (
					<EdgeLabelRenderer>
						<View
							style={{
								position: "absolute",
								transform: [
									{ translateX: labelX - 10 },
									{ translateY: labelY - 10 },
								],
							}}
							pointerEvents="box-none"
						>
							<TouchableOpacity
								onPress={onDelete}
								className="h-5 w-5 items-center justify-center rounded-full bg-red-500"
							>
								<X size={12} color="white" />
							</TouchableOpacity>
						</View>
					</EdgeLabelRenderer>
				)}
			</>
		);
	},
);

GraphEdgeComponent.displayName = "GraphEdge";
