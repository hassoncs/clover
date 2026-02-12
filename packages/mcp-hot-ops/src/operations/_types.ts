export interface OperationMeta {
	name: string;
	description: string;
	parameters: Record<
		string,
		{ type: string; description: string; required?: boolean }
	>;
	category?: string;
	docs?: string;
}

export interface Operation extends OperationMeta {
	execute: (args: Record<string, unknown>) => Promise<unknown>;
}
