import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
    console.log("Connecting to MCP server via SSE...");
    const transport = new SSEClientTransport(
        new URL("http://localhost:8090/mcp")
    );
    
    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );
    
    await client.connect(transport);
    console.log("Connected!");
    
    const ops = [
        { type: "addFrame", id: "test-frame", title: "Test Frame", width: 400, height: 400 },
        { type: "addElement", frameId: "test-frame", element: { type: "rect", fill: "#ff0000", width: 100, height: 100 } }
    ];
    
    const result = await client.callTool({
        name: "pencil_batch_design",
        arguments: {
            operations: JSON.stringify(ops)
        }
    });
    
    console.log("Result:", result);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
