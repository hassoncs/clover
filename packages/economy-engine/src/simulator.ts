import { createSeededRng, type SeededRng } from "./rng";
import type {
	EconomyEdge,
	EconomyGraph,
	EconomyNode,
	EconomyState,
	GateNode,
	PoolNode,
} from "./types";

export interface Transfer {
	edgeId: string;
	amount: number;
	from: string;
	to: string;
}

export interface EconomyEvent {
	type:
		| "pool_full"
		| "pool_empty"
		| "gate_routed"
		| "converter_activated"
		| "cycle_detected"
		| "deadlock_detected";
	nodeId?: string;
	data?: Record<string, number | string | boolean>;
}

export interface SimulationResult {
	tick: number;
	transfers: Transfer[];
	state: EconomyState;
	events: EconomyEvent[];
}

interface PlannedTransfer extends Transfer {
	requestedAmount: number;
}

export class EconomySimulator {
	private readonly graph: EconomyGraph;
	private readonly nodeById: Map<string, EconomyNode>;
	private readonly resourceEdgesByFrom: Map<string, EconomyEdge[]>;
	private readonly rng: SeededRng;
	private readonly hasResourceCycle: boolean;
	private state: EconomyState;

	constructor(graph: EconomyGraph, seed: number) {
		this.graph = graph;
		this.rng = createSeededRng(seed);
		this.nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
		this.resourceEdgesByFrom = new Map();

		for (const edge of graph.edges) {
			if (edge.type !== "resource") {
				continue;
			}
			const list = this.resourceEdgesByFrom.get(edge.from) ?? [];
			list.push(edge);
			this.resourceEdgesByFrom.set(edge.from, list);
		}

		const nodeValues: Record<string, number> = {};
		for (const node of graph.nodes) {
			if (node.type === "pool") {
				const initialValue = Math.max(0, node.initialValue ?? 0);
				nodeValues[node.id] = this.capToCapacity(node, initialValue);
			} else {
				nodeValues[node.id] = 0;
			}
		}

		this.state = {
			nodeValues,
			tick: 0,
		};

		this.hasResourceCycle = this.detectResourceCycle();
	}

	getState(): EconomyState {
		return {
			tick: this.state.tick,
			nodeValues: { ...this.state.nodeValues },
		};
	}

	run(ticks: number): SimulationResult[] {
		const results: SimulationResult[] = [];
		for (let i = 0; i < ticks; i += 1) {
			results.push(this.tick());
		}
		return results;
	}

	/**
	 * Tick algorithm
	 * 1) Planning phase: build intended transfers from the current immutable state snapshot.
	 * 2) Apply phase: apply transfers atomically with sender and receiver constraints.
	 * 3) Event phase: emit pool threshold events, gate/converter activity, and deadlock/cycle signals.
	 */
	tick(): SimulationResult {
		const planningState = this.getState();
		const events: EconomyEvent[] = [];
		const plannedTransfers: PlannedTransfer[] = [];

		if (this.hasResourceCycle) {
			events.push({ type: "cycle_detected" });
		}

		for (const node of this.graph.nodes) {
			const outgoingEdges = this.resourceEdgesByFrom.get(node.id) ?? [];
			if (outgoingEdges.length === 0) {
				continue;
			}

			switch (node.type) {
				case "source": {
					for (const edge of outgoingEdges) {
						const amount = Math.max(
							0,
							this.evaluateAmount(
								edge.formula,
								planningState,
								node.id,
								edge.to,
							),
						);
						if (amount > 0) {
							plannedTransfers.push({
								edgeId: edge.id,
								from: edge.from,
								to: edge.to,
								amount,
								requestedAmount: amount,
							});
						}
					}
					break;
				}
				case "pool":
				case "drain":
				case "converter": {
					const current = Math.max(0, planningState.nodeValues[node.id] ?? 0);
					if (current <= 0) {
						break;
					}

					let remaining = current;
					if (node.type === "converter") {
						remaining = Math.min(remaining, Math.max(0, node.rate ?? 1));
					}

					for (const edge of outgoingEdges) {
						if (remaining <= 0) {
							break;
						}
						const limit = Math.max(
							0,
							this.evaluateAmount(
								edge.formula,
								planningState,
								node.id,
								edge.to,
							),
						);
						const amount = Math.min(remaining, limit);
						if (amount <= 0) {
							continue;
						}
						remaining -= amount;
						plannedTransfers.push({
							edgeId: edge.id,
							from: edge.from,
							to: edge.to,
							amount,
							requestedAmount: amount,
						});
					}

					if (node.type === "converter" && current !== remaining) {
						events.push({
							type: "converter_activated",
							nodeId: node.id,
							data: { processed: current - remaining },
						});
					}
					break;
				}
				case "gate": {
					const gateTransfers = this.planGateTransfers(
						node,
						outgoingEdges,
						planningState,
					);
					if (gateTransfers.transfers.length > 0) {
						plannedTransfers.push(...gateTransfers.transfers);
						events.push({
							type: "gate_routed",
							nodeId: node.id,
							data: gateTransfers.byEdge,
						});
					}
					break;
				}
			}
		}

		const apply = this.applyTransfers(planningState, plannedTransfers);

		for (const node of this.graph.nodes) {
			if (node.type !== "pool") {
				continue;
			}
			const before = planningState.nodeValues[node.id] ?? 0;
			const after = apply.state.nodeValues[node.id] ?? 0;

			if (
				(node.capacity ?? Number.POSITIVE_INFINITY) > 0 &&
				this.isPoolFull(node, after) &&
				!this.isPoolFull(node, before)
			) {
				events.push({ type: "pool_full", nodeId: node.id });
			}
			if (after <= 0 && before > 0) {
				events.push({ type: "pool_empty", nodeId: node.id });
			}
		}

		if (apply.transfers.length === 0) {
			events.push({ type: "deadlock_detected" });
		}

		this.state = apply.state;

		return {
			tick: this.state.tick,
			transfers: apply.transfers,
			state: this.getState(),
			events,
		};
	}

	private planGateTransfers(
		node: GateNode,
		outgoingEdges: EconomyEdge[],
		state: EconomyState,
	): { transfers: PlannedTransfer[]; byEdge: Record<string, number> } {
		const available = Math.max(0, Math.floor(state.nodeValues[node.id] ?? 0));
		if (available <= 0) {
			return { transfers: [], byEdge: {} };
		}

		const byEdge: Record<string, number> = {};
		for (let i = 0; i < available; i += 1) {
			const selected = this.selectGateEdge(outgoingEdges);
			if (!selected) {
				continue;
			}
			byEdge[selected.id] = (byEdge[selected.id] ?? 0) + 1;
		}

		const transfers: PlannedTransfer[] = [];
		for (const edge of outgoingEdges) {
			const amount = byEdge[edge.id] ?? 0;
			if (amount <= 0) {
				continue;
			}
			transfers.push({
				edgeId: edge.id,
				from: edge.from,
				to: edge.to,
				amount,
				requestedAmount: amount,
			});
		}

		return { transfers, byEdge };
	}

	private selectGateEdge(edges: EconomyEdge[]): EconomyEdge | undefined {
		if (edges.length === 0) {
			return undefined;
		}

		const total = edges.reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
		if (total <= 0) {
			const index = this.rng.nextInt(0, edges.length - 1);
			return edges[index];
		}

		let needle = this.rng.next() * total;
		for (const edge of edges) {
			needle -= edge.probability ?? 0;
			if (needle <= 0) {
				return edge;
			}
		}

		return edges[edges.length - 1];
	}

	private applyTransfers(
		planningState: EconomyState,
		transfers: PlannedTransfer[],
	): { transfers: Transfer[]; state: EconomyState } {
		const senderBudget = new Map<string, number>();
		const receiverBudget = new Map<string, number>();

		for (const node of this.graph.nodes) {
			if (node.type === "source") {
				senderBudget.set(node.id, Number.POSITIVE_INFINITY);
			} else {
				senderBudget.set(
					node.id,
					Math.max(0, planningState.nodeValues[node.id] ?? 0),
				);
			}

			if (node.type === "pool") {
				const current = Math.max(0, planningState.nodeValues[node.id] ?? 0);
				const room = (node.capacity ?? Number.POSITIVE_INFINITY) - current;
				receiverBudget.set(node.id, Math.max(0, room));
			} else {
				receiverBudget.set(node.id, Number.POSITIVE_INFINITY);
			}
		}

		const appliedTransfers: Transfer[] = [];
		for (const transfer of transfers) {
			let amount = Math.max(0, transfer.requestedAmount);
			amount = Math.min(amount, senderBudget.get(transfer.from) ?? 0);
			amount = Math.min(amount, receiverBudget.get(transfer.to) ?? 0);
			if (amount <= 0) {
				continue;
			}

			const fromRemaining = (senderBudget.get(transfer.from) ?? 0) - amount;
			senderBudget.set(transfer.from, Math.max(0, fromRemaining));
			const toRemaining = (receiverBudget.get(transfer.to) ?? 0) - amount;
			receiverBudget.set(transfer.to, Math.max(0, toRemaining));

			appliedTransfers.push({
				edgeId: transfer.edgeId,
				from: transfer.from,
				to: transfer.to,
				amount,
			});
		}

		const nextValues = { ...planningState.nodeValues };
		for (const transfer of appliedTransfers) {
			const fromNode = this.nodeById.get(transfer.from);
			if (fromNode && fromNode.type !== "source") {
				nextValues[transfer.from] = Math.max(
					0,
					(nextValues[transfer.from] ?? 0) - transfer.amount,
				);
			}
			nextValues[transfer.to] =
				(nextValues[transfer.to] ?? 0) + transfer.amount;
			const toNode = this.nodeById.get(transfer.to);
			if (toNode?.type === "pool") {
				nextValues[transfer.to] = this.capToCapacity(
					toNode,
					nextValues[transfer.to],
				);
			}
		}

		return {
			transfers: appliedTransfers,
			state: {
				tick: planningState.tick + 1,
				nodeValues: nextValues,
			},
		};
	}

	private evaluateAmount(
		formula: string | undefined,
		state: EconomyState,
		from: string,
		to: string,
	): number {
		if (!formula) {
			return 1;
		}

		const scope: Record<string, number> = {
			tick: state.tick,
			fromValue: state.nodeValues[from] ?? 0,
			toValue: state.nodeValues[to] ?? 0,
		};

		for (const [nodeId, value] of Object.entries(state.nodeValues)) {
			scope[nodeId.replace(/[^A-Za-z0-9_]/g, "_")] = value;
		}

		try {
			const evaluator = new Function(
				...Object.keys(scope),
				`return (${formula});`,
			);
			const raw = Number(evaluator(...Object.values(scope)));
			if (!Number.isFinite(raw)) {
				return 0;
			}
			return Math.max(0, raw);
		} catch {
			return 0;
		}
	}

	private capToCapacity(node: PoolNode, value: number): number {
		if (node.capacity === undefined) {
			return Math.max(0, value);
		}
		return Math.max(0, Math.min(node.capacity, value));
	}

	private isPoolFull(node: PoolNode, value: number): boolean {
		if (node.capacity === undefined) {
			return false;
		}
		return value >= node.capacity;
	}

	private detectResourceCycle(): boolean {
		const adjacency = new Map<string, string[]>();
		for (const node of this.graph.nodes) {
			adjacency.set(node.id, []);
		}
		for (const edge of this.graph.edges) {
			if (edge.type !== "resource") {
				continue;
			}
			const list = adjacency.get(edge.from);
			if (list) {
				list.push(edge.to);
			}
		}

		const visited = new Set<string>();
		const inStack = new Set<string>();

		const dfs = (nodeId: string): boolean => {
			if (inStack.has(nodeId)) {
				return true;
			}
			if (visited.has(nodeId)) {
				return false;
			}
			visited.add(nodeId);
			inStack.add(nodeId);
			for (const next of adjacency.get(nodeId) ?? []) {
				if (dfs(next)) {
					return true;
				}
			}
			inStack.delete(nodeId);
			return false;
		};

		for (const node of this.graph.nodes) {
			if (dfs(node.id)) {
				return true;
			}
		}

		return false;
	}
}
