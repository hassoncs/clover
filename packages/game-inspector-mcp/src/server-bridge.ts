import type { PenToolFacade } from "@slopcade/design-canvas/pen/runtime";

let _facade: PenToolFacade | null = null;

export const ServerBridge = {
	register(facade: PenToolFacade): void {
		_facade = facade;
	},
	getInstance(): PenToolFacade | null {
		return _facade;
	},
	isAvailable(): boolean {
		return _facade !== null;
	},
	clear(): void {
		_facade = null;
	},
};
