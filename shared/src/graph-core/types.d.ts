export type PortDirection = "input" | "output";
export interface GraphPort {
    id: string;
    direction: PortDirection;
    dataType: string;
    label?: string;
}
export interface GraphNode {
    id: string;
    type: string;
    position: {
        x: number;
        y: number;
    };
    ports: GraphPort[];
    data: Record<string, unknown>;
    label?: string;
}
export interface GraphEdge {
    id: string;
    from: {
        nodeId: string;
        portId: string;
    };
    to: {
        nodeId: string;
        portId: string;
    };
}
export interface GraphViewport {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
}
export interface GraphDocument {
    id: string;
    nodes: Record<string, GraphNode>;
    edges: Record<string, GraphEdge>;
    viewport: GraphViewport;
}
export type GraphCommandType = "addNode" | "removeNode" | "connect" | "disconnect" | "moveNode" | "pan" | "zoom" | "updateNodeData" | "batch";
export interface AddNodeCommand {
    type: "addNode";
    node: GraphNode;
}
export interface RemoveNodeCommand {
    type: "removeNode";
    nodeId: string;
}
export interface ConnectCommand {
    type: "connect";
    edge: GraphEdge;
}
export interface DisconnectCommand {
    type: "disconnect";
    edgeId: string;
}
export interface MoveNodeCommand {
    type: "moveNode";
    nodeId: string;
    position: {
        x: number;
        y: number;
    };
}
export interface PanCommand {
    type: "pan";
    pan: {
        x: number;
        y: number;
    };
}
export interface ZoomCommand {
    type: "zoom";
    zoom: number;
    center?: {
        x: number;
        y: number;
    };
}
export interface UpdateNodeDataCommand {
    type: "updateNodeData";
    nodeId: string;
    data: Record<string, unknown>;
}
export interface BatchCommand {
    type: "batch";
    commands: GraphCommand[];
}
export type GraphCommand = AddNodeCommand | RemoveNodeCommand | ConnectCommand | DisconnectCommand | MoveNodeCommand | PanCommand | ZoomCommand | UpdateNodeDataCommand | BatchCommand;
export interface UndoableState {
    document: GraphDocument;
    past: GraphDocument[];
    future: GraphDocument[];
}
export interface CommandResult {
    state: UndoableState;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map