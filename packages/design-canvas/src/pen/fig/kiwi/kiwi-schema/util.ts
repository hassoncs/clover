export function quote(text: string): string {
	return JSON.stringify(text);
}

interface SchemaError extends Error {
	line: number;
	column: number;
}

export function error(text: string, line: number, column: number): never {
	const err = new Error(text) as SchemaError;
	err.line = line;
	err.column = column;
	throw err;
}
