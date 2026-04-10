import { readFileSync } from "fs";
const doc = JSON.parse(readFileSync("/tmp/pencil-cli-doc.json", "utf-8"));

// Find the Login ref and trace what it resolves to
const authFrame = doc.children[1]; // Auth & Settings
const loginRef = authFrame.children.find((c: any) => c.name === "Login");
console.log("Login ref:", JSON.stringify(loginRef, null, 2));

// Now find the definition it references
function findReusable(nodes: any[], id: string): any {
  for (const node of nodes) {
    if ((node.type === "frame" || node.type === "ref") && node.reusable && node.id === id) return node;
    if (node.children) {
      const found = findReusable(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

const loginDef = findReusable(doc.children, loginRef.ref);
if (loginDef) {
  console.log("\nLogin component definition:");
  console.log("  type:", loginDef.type);
  console.log("  reusable:", loginDef.reusable);
  console.log("  children count:", loginDef.children?.length);
  
  // Show first few children with their text content
  function showTextContent(nodes: any[], depth: number = 0) {
    for (const node of nodes.slice(0, 30)) {
      const indent = "  ".repeat(depth);
      let info = `${indent}${node.type} id=${node.id}`;
      if (node.name) info += ` name="${node.name}"`;
      if (node.content) info += ` content="${String(node.content).substring(0, 60)}"`;
      if (node.width) info += ` w=${node.width}`;
      if (node.height) info += ` h=${node.height}`;
      if (node.textGrowth) info += ` growth=${node.textGrowth}`;
      console.log(info);
      if (node.children) showTextContent(node.children, depth + 1);
    }
  }
  console.log("\nLogin children:");
  showTextContent(loginDef.children);
} else {
  console.log("Login definition NOT FOUND!");
}
