import { readFileSync } from "fs";

const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
const doc = JSON.parse(docJson);

// Check what variables look like
console.log("Variables:", JSON.stringify(doc.variables, null, 2).substring(0, 2000));

// Find nodes that reference variables in their content
function findVarRefs(nodes: any[], path: string = ""): Array<{ path: string; value: string }> {
  const results: Array<{ path: string; value: string }> = [];
  for (const node of nodes) {
    const currentPath = path ? `${path}/${node.id}` : node.id;
    if (node.content && typeof node.content === "string" && node.content.startsWith("$--")) {
      results.push({ path: currentPath, value: node.content });
    }
    // Also check fill
    if (node.fill && typeof node.fill === "object" && node.fill.color && typeof node.fill.color === "string" && node.fill.color.startsWith("$--")) {
      results.push({ path: `${currentPath}.fill.color`, value: node.fill.color });
    }
    if (node.children) {
      results.push(...findVarRefs(node.children, currentPath));
    }
    if (node.descendants) {
      for (const [dPath, dNode] of Object.entries(node.descendants) as any) {
        const childPath = `${currentPath}/descendants/${dPath}`;
        if (dNode.content && typeof dNode.content === "string" && dNode.content.startsWith("$--")) {
          results.push({ path: childPath, value: dNode.content });
        }
      }
    }
  }
  return results;
}

const varRefs = findVarRefs(doc.children);
console.log(`\nFound ${varRefs.length} variable references:`);
varRefs.forEach((r) => console.log(`  ${r.path}: ${r.value}`));

// Now check: does resolveTreeVariables handle descendants?
// Let's look at the variables.ts file
console.log("\n--- Checking variables.ts ---");
