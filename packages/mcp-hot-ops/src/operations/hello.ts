import type { Operation } from "./_types";

const operation: Operation = {
	name: "hello",
	description:
		"Returns a greeting message. Use this to verify the MCP is working.",
	parameters: {
		name: { type: "string", description: "Name to greet", required: false },
	},
	execute: async (args) => {
		const name = (args.name as string) || "world";
		return { message: `Hello, ${name}!`, timestamp: new Date().toISOString() };
	},
};

export default operation;
