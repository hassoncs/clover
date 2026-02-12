import type { Operation } from "./_types";

const operation: Operation = {
	name: "add_numbers",
	description: "Add two numbers together. A simple math operation for testing.",
	parameters: {
		a: { type: "number", description: "First number", required: true },
		b: { type: "number", description: "Second number", required: true },
	},
	execute: async (args) => {
		const a = Number(args.a);
		const b = Number(args.b);
		if (isNaN(a) || isNaN(b)) {
			throw new Error("Both 'a' and 'b' must be valid numbers");
		}
		return { result: a + b, expression: `${a} + ${b} = ${a + b}` };
	},
};

export default operation;
