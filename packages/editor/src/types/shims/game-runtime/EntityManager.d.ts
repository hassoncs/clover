export interface EntityManager {
	getAllEntities: () => Array<{
		id: string;
		name: string;
		transform: { x: number; y: number };
	}>;
}
