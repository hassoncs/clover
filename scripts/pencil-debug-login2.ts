import { readFileSync } from "fs";
const doc = JSON.parse(readFileSync("/tmp/pencil-cli-doc.json", "utf-8"));

// Find Phone Frame definition (cwYHj)
function findNode(nodes: any[], id: string): any {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

const phoneFrame = findNode(doc.children, "cwYHj");
if (phoneFrame) {
  console.log("Phone Frame:");
  console.log("  type:", phoneFrame.type);
  console.log("  reusable:", phoneFrame.reusable);
  console.log("  width:", phoneFrame.width);
  console.log("  height:", phoneFrame.height);
  console.log("  children:", phoneFrame.children?.map((c: any) => `${c.type}:${c.id}(${c.name})`).join(", "));
  
  // Check Content child
  const content = phoneFrame.children?.find((c: any) => c.id === "9nttM");
  if (content) {
    console.log("\nContent child:");
    console.log("  type:", content.type);
    console.log("  children:", content.children?.length);
    console.log("  first children:", content.children?.slice(0, 3).map((c: any) => `${c.type}:${c.id}(${c.name})`).join(", "));
  }
} else {
  console.log("Phone Frame NOT FOUND!");
}

// Now test: what does resolveRef do with the Login ref and Phone Frame?
// The Login ref has descendants.9nttM with children.
// The Phone Frame has children[1] = Content (id=9nttM).
// descendants patch should REPLACE content.children with the new children.

// Let me manually trace the resolution
const loginRef = findNode(doc.children, "YDFxV");
console.log("\nLogin ref descendants keys:", Object.keys(loginRef.descendants || {}));

// The descendants key is "9nttM" — this should patch the Content node
const contentPatch = loginRef.descendants["9nttM"];
console.log("Content patch:", JSON.stringify(contentPatch).substring(0, 500));

// Find how many children the patch provides
if (contentPatch && contentPatch.children) {
  console.log("Patch children count:", contentPatch.children.length);
  console.log("Patch children IDs:", contentPatch.children.map((c: any) => `${c.type}:${c.id}(${c.name || ''})`).join(", "));
}
